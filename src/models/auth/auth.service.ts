import { Injectable } from '@nestjs/common';
import { CrateDbService } from 'src/common/common/crateDb.service';
import { DB_CONFIG, SECRETS } from 'src/shared/config/global-db-config';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { HashService } from 'src/shared/services/hash/hash.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import { JwtService } from '@nestjs/jwt';
import { CommonService } from 'src/shared/services/common/common.service';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private hashService: HashService,
        private queryGenratorService: QueryGenratorService,
        private crateDbService: CrateDbService,
        private commonService:CommonService
    ) { }

    async registerUser(body): Promise<any> {
        console.log(body);
        const hashedPassword = await this.hashService.hashPassword(body?.password);
        body.password = hashedPassword;
        console.log("After Pwd  : " + JSON.stringify(body));
        const excludedColumns = ['responsekey', 'domain'];

        const { query, values } = this.queryGenratorService.generateInsertQueryExcludedColumns(`${DB_CONFIG.CRATEDB.mode}meta.users`, body, excludedColumns);
        console.log(query);
        return await this.crateDbService.executeQuery(query);

        // Save the username and hashedPassword to the database
    }

    async login(type,user: any): Promise<ApiResponse<any>> {
        try {
            const getTableName = type.split('.')[0].toLowerCase();
            if (typeof user === 'string') {
                // If the user variable is a string, it means it's an error message.
                return new ApiResponse(false, user);
            }
           

            const sanitizedUsername = user.username.replace(/\s/g, '');
           
            let query = `SELECT  * FROM ${DB_CONFIG.CRATEDB.mode}meta.users WHERE LOWER((username)) = LOWER(('${sanitizedUsername}')) AND applicationId = '${user.applicationId}'`;
            const getuserDetail = await this.crateDbService.executeQuery(query);

            if (getuserDetail.data?.length == 0) {
                return new ApiResponse(false, 'username is incorrect');
            }
           
            const getuser = getuserDetail?.data?.[0];
            if (getuser?.status == 'Pending') {
                return new ApiResponse(false, 'user not approved');
            }
            const orgQuery = `SELECT name FROM ${DB_CONFIG.CRATEDB.mode}meta.organization WHERE id = '${getuserDetail?.data[0]?.organizationid}';  `

            const getorganization = await this.crateDbService.executeQuery(orgQuery);
            const organization = getorganization?.data?.[0];
            // let organization = await this.organizationService.getById(getuser.organizationId);
            const payload = { username: getuser.username, sub: getuser.id, status: user.status };
            const objAuth = {
                access_token: this.jwtService.sign(payload, { secret: SECRETS.secretKey, expiresIn: '10h' }),
                refresh_token: this.jwtService.sign(
                    { username: getuser.username, sub: getuser.id, status: getuser.status },
                    { secret: SECRETS.secretKey, expiresIn: '10h' },
                ),
                username: getuser.username,
                status: getuser.status,
                userId: getuser.id,
                applicationId: getuser.applicationid,
                organizationId: getuser.organizationid,
                organizationName: organization.name,
                name: `${getuser.firstName} ${getuser.lastname}`,
                contactnumber: getuser?.contactnumber,
            };

            if (objAuth?.status == 'Approved' || objAuth?.status == undefined) {
                let userMapping: any = await this.findUserPolicyAll(getTableName,getuser.id);

                let newMapping = [];
                let policyBulk;
                console.log("AllnewMapping", JSON.stringify(newMapping));

                objAuth['policyBulk'] = [];

                for (let element of userMapping) {
                    try {
                        // Fetch policy data using a CrateDB-compatible query
                        const policyQuery = ` SELECT name, applicationTheme FROM ${DB_CONFIG.CRATEDB.mode}meta.policy WHERE id = '${element.policyid}'`;
                        const policyResult = await this.crateDbService.executeQuery(policyQuery);

                        const policy = policyResult.data?.length > 0 ? policyResult.data[0] : null;

                        let elementCopy = { ...element };
                        elementCopy['policyName'] = policy ? policy.name : "N/A";
                        elementCopy['policyTheme'] = policy ? policy.applicationTheme : '';
                        objAuth['policy'] = elementCopy;

                    } catch (err) {
                        console.error("Error fetching policy:", err);
                    }
                }
                objAuth['policyBulk'] = userMapping;

                return new ApiResponse(true, 'Data Retrieved', objAuth);
            } else {
                return new ApiResponse(false, 'User is not approved..!');
            }

        }
        catch (error) {
            console.log('error : ' + error)
            // this.errorLogger.error(`API: login - Login: ${error}`);
            return new ApiResponse(false, error.message);
        }
    }


    async validateUser(username: string, plainTextPassword: string): Promise<boolean> {
        // Retrieve the user and hashed password from the database
        return this.hashService.comparePassword('storedHash', plainTextPassword);
    }

    async getAppDetails(tablename: string, domain: string) {
        const getTableName = tablename;

        let cmd: string;

        cmd = `SELECT  apps.*,og.id as organizationid, dep.id as departmentid, dep.name as departmentname, apps.name as applicationname
        FROM ${DB_CONFIG.CRATEDB.mode}meta.Application apps
        JOIN ${DB_CONFIG.CRATEDB.mode}meta.Department dep ON apps.departmentid = dep.id
        JOIN ${DB_CONFIG.CRATEDB.mode}meta.organization og ON dep.organizationid = og.id
        Where  apps.domains = '${domain}';`;

        return await this.crateDbService.executeQuery(cmd);
    }
    async getByDomain(type, id: string): Promise<ApiResponse<any>> {
        try {

            const getTableName = type.split('.')[0].toLowerCase();
            const query = `  SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.application WHERE  domains ='${id}'`;

            const result = await this.crateDbService.executeQuery(query);

            if (!result.isSuccess && !result?.data) {
                return new ApiResponse(false, 'No data found');
            }

            const instance = result.data?.[0];

            // Query to retrieve department data
            const findDepartmentQuery = `SELECT *  FROM ${DB_CONFIG.CRATEDB.mode}meta.department WHERE id = '${instance.departmentid}' `;

            const findDepartmentResult = await this.crateDbService.executeQuery(findDepartmentQuery);

            const findDepartment = findDepartmentResult.data?.length > 0 ? findDepartmentResult.data[0] : undefined;
            
            const obj = {
                application: instance,
                department: findDepartment
            };

            return new ApiResponse<any>(true, 'Success', obj);
        } catch (error) {
            return new ApiResponse<any>(false, error.message);
        }
    }

    async findUserPolicyAll(modelType, id: string) {
        const query = ` SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.usermapping  WHERE userid = '${id}'`;

        const result = await this.crateDbService.executeQuery(query);

        // Check if a default policy exists
        const defaultPolicy = result.data?.length > 0
            ? result.data.find((mapping: any) => mapping.defaultpolicy === true || mapping.defaultpolicy === 'true')
            : undefined;

        if (defaultPolicy) {
            return [defaultPolicy];
        }

        // If no default policy exists, return the last mapping
        if (result.data?.length > 0) {
            return [result.data[0]];
        }

        // If no mappings are found, return undefined or handle it as needed
        return;
    }
}
