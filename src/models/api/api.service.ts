import { Injectable } from '@nestjs/common';
import { CrateDbService } from 'src/common/common/crateDb.service';
import { DB_CONFIG } from 'src/shared/config/global-db-config';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { CommonService } from 'src/shared/services/common/common.service';
import { HashService } from 'src/shared/services/hash/hash.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
const { v4: uuidv4 } = require('uuid');

@Injectable()
export class ApiService {

    /**
     *
     */
    constructor(private readonly crateDbService: CrateDbService,
        private queryGenratorService: QueryGenratorService,
        private readonly commonService: CommonService,
        private hashService: HashService,
    ) {


    }

    async get() {
        const cmd = `select * from ${DB_CONFIG.CRATEDB.mode}met.organization limit 100;`
        return await this.crateDbService.executeQuery(cmd);
    }

    async getAll(tablename: string, organizationId, appId, userId) {
        const getTableName = tablename.split('.')[1].toLowerCase();
        const dbType = tablename.split('.')[0].toLowerCase();

        let cmd: string;

        switch (getTableName) {
            case 'screenbuilder':
                cmd = `SELECT sc.*, dep.name as departmentname, apps.name as applicationname
                       FROM ${dbType}.ScreenBuilder sc
                       JOIN ${dbType}.Department dep ON sc.departmentid = dep.id
                       JOIN ${dbType}.Application apps ON sc.applicationid = apps.id
                       Where applicationid = '${appId}' order by sc.createddate desc;`;
                break;

            case 'usermapping':
                cmd = `select up.*, p.name as policyname , us.username as username from ${dbType}.usermapping up 
                        join ${dbType}.policy p on p.id  = up.policyid
                        join ${dbType}.users us on us.id = up.userid where up.applicationid  = '${appId}' order by up.createddate desc; `;

                break;
            case 'department':
                cmd = `SELECT * FROM ${tablename} WHERE organizationid = '${organizationId}' order by createddate desc;`;
                break;
            case 'organization':
                cmd = `SELECT * FROM ${tablename} where id  = '${organizationId}' order by createddate desc;`;
                break;
            case 'application':
                cmd = `SELECT * FROM ${tablename}  order by createddate desc;`;
                break;
            case 'controls':
                cmd = `SELECT * FROM ${tablename} `;
                break;
            default:
                cmd = `SELECT * FROM ${tablename} Where applicationid = '${appId}' order by createddate desc;`;
                break;
        }

        return await this.crateDbService.executeQuery(cmd);
    }

    async getById(tablename: string, id: any, organizationId, appId, userId) {
        const getTableName = tablename.split('.')[1].toLowerCase();
        const dbMode = tablename.split('.')[0].toLowerCase();

        let cmd: string;

        switch (getTableName) {
            case 'department':
                cmd = `SELECT * FROM ${tablename} WHERE organizationid = '${id}' order by  createddate desc;`;
                break;

            case 'application':
                cmd = `SELECT * FROM ${tablename} WHERE departmentid = '${id}' order by  createddate desc;`;
                break;

            case 'screenbuilder':
            case 'menu':
                cmd = `SELECT * FROM ${tablename} WHERE applicationid = '${id}' order by  createddate desc;`;
                break;
            case 'actionss':
                cmd = `SELECT * FROM ${dbMode}.actions WHERE applicationid = '${id}' order by  createddate desc;`;
                break;

            case 'applicationtheme':
                cmd = `SELECT * FROM ${tablename} WHERE themename = '${id}' AND applicationid = '${appId}' order by  createddate desc;`;
                break;
            case 'builders':
            case 'buildersnew':
                const isObjectId = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);
                if (isObjectId)
                    cmd = `SELECT * FROM ${tablename} WHERE screenbuilderid = '${id}'  AND applicationid = '${appId}' ;`;
                else
                    cmd = `SELECT * FROM ${tablename} WHERE navigation = '${id}'  AND applicationid = '${appId}' ;`;

                break;

            case 'validationrule':
            case 'uirule':
            case 'businessrule':
            case 'gridbusinessrule':
            case 'actions':
            case 'actionrule':
            case 'cacherule':
                cmd = `SELECT * FROM ${tablename} WHERE screenbuilderid = '${id}'  AND applicationid = '${appId}' order by  createddate desc;`;
                break;
            case 'getpolicy':
                cmd = `SELECT * FROM ${dbMode}.policymapping WHERE userId = '${id}'  AND applicationid = '${appId}' order by  createddate desc;`;
                break;

            case 'policymapping':
                cmd = `SELECT * FROM ${tablename} WHERE policyid = '${id}'  AND applicationid = '${appId}' order by  createddate desc;`;
                break;
            case 'policymappingnew':
                cmd = `SELECT * FROM ${tablename} WHERE policyid = '${id}'  AND applicationid = '${appId}' order by  createddate desc;`;
                break;


            default:
                cmd = `SELECT * FROM ${tablename} WHERE id = '${id}'  AND applicationid = '${appId}' order by  createddate desc;`;
                break;
        }

        return await this.crateDbService.executeQuery(cmd);
    }

    async create(body, organizationId, appId, userId): Promise<any> {
        const keys = Object.keys(body);
        const tablename = keys[0];
        const onlytableName = tablename?.split('.')?.[1];
        const dbType = tablename?.split('.')?.[0];
        let bodyData = body[tablename];
        if (onlytableName.toLowerCase() == 'application') {
            const propertiesToDelete = ['password'];
            bodyData = Object.fromEntries(Object.entries(bodyData).filter(([key]) => !propertiesToDelete.includes(key)));
        }
        if (onlytableName.toLowerCase() == 'tables' || onlytableName.toLowerCase() == 'tableschema') {
            bodyData["creatdby"] = userId;
            bodyData["createdon"] = this.getCurrentTimestamp().timestamp;
            bodyData["organizationid"] = organizationId;
        }
        // bodyData["applicationid"] = appId;
        const { query, values } = this.queryGenratorService.generateInsertQuery(tablename, bodyData);

        if (onlytableName.toLowerCase() == 'usermapping') {
            if (bodyData?.defaultPolicy == true) {

                // Find the user mapping with defaultPolicy set to true
                const userMappingWithTrue = await this.crateDbService.executeQuery(
                    `SELECT * FROM ${dbType}.usermapping WHERE userId = '${bodyData?.userId}' AND defaultPolicy = true;`
                );

                if (userMappingWithTrue && userMappingWithTrue?.data.length > 0) {
                    userMappingWithTrue?.data?.forEach(async element => {
                        const updateRecords = await this.crateDbService.executeQuery(
                            `UPDATE ${dbType}.usermapping SET defaultPolicy = false WHERE userId = '${element.userid}'`
                        );
                    });

                }
            }
        }

        const savedInstance = await this.crateDbService.executeQuery(query);

        if (onlytableName.toLowerCase() == 'application') {
            const newAppId = savedInstance?.data?.[0]?.id

            await this.supperAdminCreate(body, savedInstance, newAppId);
        }
        else if (savedInstance?.isSuccess && (onlytableName?.toLowerCase() == "businessrule" || onlytableName?.toLowerCase() == "uirule"
            || onlytableName?.toLowerCase() == "validationrule" || onlytableName?.toLowerCase() == "gridbusinessrule" || onlytableName?.toLowerCase() == 'actionrule')) {

            await this.cacheRuleManagement(tablename, appId, 'create', savedInstance?.data?.[0], false);
        }
        return savedInstance;
    }

    async createTable(body, organizationId, appId, userId): Promise<any> {
        const keys = Object.keys(body);
        const tablename = body.tablename;
        let schema = body.schema;
        schema = {
            ...schema,
            id: "STRING PRIMARY KEY",
            isactive: "BOOLEAN",
            creatdby: "STRING",
            updatedby: "STRING",
            createdon: "TIMESTAMP",
            updatedon: "TIMESTAMP",
            screenbuilderid: "STRING",
            organizationid: "STRING",
            applicationid: "STRING"
        };
        const getTableQuery = `SELECT table_name FROM information_schema.tables WHERE table_name = $1;`;
        const existingTable = await this.crateDbService.executeQuery(getTableQuery, [tablename]);
        if (existingTable.data.length > 0) {
            const { addColumnQuery, dropColumnQuery } = await this.queryGenratorService.generateModifyTableQuery(tablename, schema);
            let savedInstance;
            if (addColumnQuery) {
                savedInstance = await this.crateDbService.executeQuery(addColumnQuery);
            }
            if (dropColumnQuery) {
                savedInstance = await this.crateDbService.executeQuery(dropColumnQuery);
            }
            return savedInstance ? savedInstance : new ApiResponse(true, 'No modification available in table', []);
        } else {
            const { query } = this.queryGenratorService.generateCreateQuery(tablename, schema);
            const savedInstance = await this.crateDbService.executeQuery(query);
            return savedInstance;
        }
    }

    async insertNewTable(body, organizationId, appId, userId): Promise<any> {
        const tableName = this.commonService.tableList.find(entry => entry.key === 'tables');
        const table = body.table
        const tableFields = body.tableFields
        const chkExistTableQuery = `SELECT * FROM ${tableName.value} WHERE tablename = '${table.tableName}'`;
        const chkExistInstance = await this.crateDbService.executeQuery(chkExistTableQuery);

        if (chkExistInstance.data.length > 0) {
            table["totalFields"] = tableFields.length;
            table["updatedby"] = userId;
            table["updatedon"] = this.getCurrentTimestamp().timestamp;
            table["organizationid"] = organizationId;
            table["applicationid"] = appId;
            const { query, values } = this.queryGenratorService.generateUpdateQuery(tableName.value, chkExistInstance.data[0].id, body.table)
            const updateInstance = await this.crateDbService.executeQuery(query);
            if (updateInstance.data.length > 0) {
                const tableSchemaName = this.commonService.tableList.find(entry => entry.key === 'tableschema');
                const chkExistTableFieldQuery = `SELECT * FROM ${tableSchemaName.value} WHERE tableid = '${updateInstance.data[0].id}'`;
                const chkExistInstance = await this.crateDbService.executeQuery(chkExistTableFieldQuery);
                const deleteRow = chkExistInstance.data.filter(fields => !tableFields.some(dataField => dataField.fieldName === fields.fieldname));
                let deleteInstance;
                if (deleteRow.length > 0) {
                    const { delQueery } = this.queryGenratorService.generateDeleteTblSchema(tableSchemaName.value, deleteRow);
                    deleteInstance = await this.crateDbService.executeQuery(delQueery);
                }
                let savedInstance
                const updateRow = tableFields.filter(fields => !chkExistInstance.data.some(dataField => dataField.fieldname === fields.fieldName));
                if (updateRow.length > 0) {
                    updateRow.forEach(element => {
                        element["tableid"] = updateInstance.data[0].id;
                        element["creatdby"] = userId;
                        element["createdon"] = this.getCurrentTimestamp().timestamp;
                        element["organizationid"] = organizationId;
                        element["applicationid"] = appId;
                    });
                    const { query, values } = this.queryGenratorService.generateMultiInsertQuery(tableSchemaName.value, updateRow);
                    savedInstance = await this.crateDbService.executeQuery(query);
                    const savedInstanceupdate = {
                        count: savedInstance.count,
                        isSuccess: savedInstance.isSuccess,
                        message: savedInstance.message,
                        data: [
                            {
                                table: updateInstance.data,
                                tableFields: savedInstance.data,
                            }
                        ]
                    }
                    return savedInstanceupdate;
                }
                const savedInstanceupdate = {
                    isSuccess: false,
                    message: "data not updated ",
                    data: []
                }
                return deleteInstance ? deleteInstance : savedInstanceupdate;
            }
            return updateInstance;
        } else {
            table["totalFields"] = tableFields.length;
            table["creatdby"] = userId;
            table["createdon"] = this.getCurrentTimestamp().timestamp;
            table["organizationid"] = organizationId;
            table["applicationid"] = appId;
            const { query, values } = this.queryGenratorService.generateInsertQuery(tableName.value, body.table)
            const savedTableInstance = await this.crateDbService.executeQuery(query);
            if (savedTableInstance.data.length > 0) {
                const tableSchemaName = this.commonService.tableList.find(entry => entry.key === 'tableschema');
                tableFields.forEach(element => {
                    element["tableid"] = savedTableInstance.data[0].id;
                    element["creatdby"] = userId;
                    element["createdon"] = this.getCurrentTimestamp().timestamp;
                    element["organizationid"] = organizationId;
                    element["applicationid"] = appId;
                });
                const { query, values } = await this.queryGenratorService.generateMultiInsertQuery(tableSchemaName.value, tableFields);
                const savedInstance = await this.crateDbService.executeQuery(query);

                const tableInstance = {
                    isSuccess: savedInstance.isSuccess,
                    message: savedInstance.message,
                    data: [
                        {
                            table: savedTableInstance.data,
                            tableFields: savedInstance.data
                        }
                    ]
                }
                return tableInstance;
            }
            return savedTableInstance;
        }
    }

    async dropColumns(body, organizationId, appId, userId): Promise<any> {
        const tablename = body.tablename;
        const objColumns = body.columns;
        const { delQueery } = this.queryGenratorService.generateDeleteTblSchema(tablename, objColumns);
        const { query } = this.queryGenratorService.generateDropColumnQuery(tablename, objColumns);
        const savedInstanceRow = await this.crateDbService.executeQuery(delQueery);
        const savedInstance = await this.crateDbService.executeQuery(query);
        return savedInstance;
    }

    async dropTable(tableName, organizationId, appId, userId): Promise<any> {
        const { query } = this.queryGenratorService.generateDropTableQuery(tableName);
        const savedInstance = await this.crateDbService.executeQuery(query);
        return savedInstance;
    }

    async update(tablename, id, body, orgId, appId, userId): Promise<any> {
        const dbType = tablename?.split('.')?.[0];
        const onlytableName = tablename?.split('.')?.[1];
        const bodyData = body[tablename];

        if (onlytableName.toLowerCase() == 'tables' || onlytableName.toLowerCase() == 'tableschema') {
            bodyData["updatedby"] = userId;
            bodyData["updatedon"] = this.getCurrentTimestamp().timestamp;
        }
        if (onlytableName.toLowerCase() == 'builders' || onlytableName.toLowerCase() == 'buildersnew') {

            const deleteData = await this.delete(tablename, bodyData.id, orgId, appId, userId);
            const createData = await this.create(body, orgId, appId, userId);
            return createData;

        } else {
            const { query, values } = this.queryGenratorService.generateUpdateQuery(tablename, id, bodyData);

            if (onlytableName.toLowerCase() == 'usermapping') {
                if (bodyData?.defaultPolicy == true) {

                    // Find the user mapping with defaultPolicy set to true
                    const userMappingWithTrue = await this.crateDbService.executeQuery(
                        `SELECT * FROM ${dbType}.usermapping WHERE userId = '${bodyData?.userId}' AND defaultPolicy = true;`
                    );

                    if (userMappingWithTrue && userMappingWithTrue?.data.length > 0) {
                        userMappingWithTrue?.data?.forEach(async element => {
                            const updateRecords = await this.crateDbService.executeQuery(
                                `UPDATE ${dbType}.usermapping SET defaultPolicy = false WHERE userId = '${element.userid}'`
                            );
                        });

                    }
                }
            }

            const updatedInstance = await this.crateDbService.executeQuery(query);



            if (updatedInstance?.isSuccess && (onlytableName?.toLowerCase() == "businessrule" || onlytableName?.toLowerCase() == "uirule"
                || onlytableName?.toLowerCase() == "validationrule" || onlytableName?.toLowerCase() == "gridbusinessrule" || onlytableName?.toLowerCase() == 'actionrule')) {
                const makeJsonObj = {
                    json: updatedInstance?.data?.[0]
                }
                await this.cacheRuleManagement(tablename, appId, 'update', makeJsonObj, false);
            }

            return updatedInstance;
        }

    }

    async delete(tablename, id, orgId, appId, userId): Promise<any> {
        const { query } = this.queryGenratorService.generateDeleteQuery(tablename, id);

        let instanceData;
        const onlytableName = tablename?.split('.')?.[1];
        if (onlytableName?.toLowerCase() == "businessrule" || onlytableName?.toLowerCase() == "uirule"
            || onlytableName?.toLowerCase() == "validationrule" || onlytableName?.toLowerCase() == "gridbusinessrule" || onlytableName?.toLowerCase() == 'actionrule') {
            const cmd = `SELECT * FROM ${tablename} WHERE id = '${id}'`;
            instanceData = await this.crateDbService.executeQuery(cmd);
        }

        const deletedInstance = await this.crateDbService.executeQuery(query);
        if (deletedInstance?.isSuccess && (onlytableName?.toLowerCase() == "businessrule" || onlytableName?.toLowerCase() == "uirule"
            || onlytableName?.toLowerCase() == "validationrule" || onlytableName?.toLowerCase() == "gridbusinessrule" || onlytableName?.toLowerCase() == 'actionrule')) {
            const makeJsonObj = {
                json: instanceData?.data?.[0]
            }
            await this.cacheRuleManagement(tablename, appId, 'delete', makeJsonObj, false);
        }

        return deletedInstance;
    }

    async cacheRuleManagement(type: string, appId: string, actionType: string, instance: any, multiple: boolean) {
        const getTableName = type.split('.')?.[0];
        const id = uuidv4();

        if (!multiple) {
            let cmd: string;

            switch (actionType) {
                case 'update':
                case 'delete':
                    cmd = `SELECT * FROM ${getTableName}.cacheRule
                           WHERE screenbuilderid = '${instance?.screenbuilderid}'
                             AND applicationId = '${appId}'
                             AND name = '${type}'
                             AND ruleid = '${instance?.id}'`;

                    const existingRecord = await this.crateDbService.executeQuery(cmd);

                    const updateCmd = `UPDATE ${getTableName}.cacheRule
                                       SET screenbuilderid = '${instance?.screenbuilderid}',
                                           name = '${type}',
                                           data = '${JSON.stringify(instance)}',
                                           applicationId = '${appId}',
                                           ruleid = '${instance?.id}'
                                       WHERE ruleid = '${instance?.id}'`;

                    if (actionType === 'update') {
                        if (!existingRecord || existingRecord?.data?.length === 0) {
                            const insertCmd = `INSERT INTO ${getTableName}.cacheRule (id,screenbuilderid, name, data, applicationId, ruleid)
                                               VALUES ('${id}','${instance.screenbuilderid}', '${type}', '${JSON.stringify(instance)}', '${appId}', '${instance.id}')`;
                            const insertedInstance = await this.crateDbService.executeQuery(insertCmd);
                        } else {
                            const result = await this.crateDbService.executeQuery(updateCmd);
                        }
                    } else {
                        if (existingRecord && existingRecord?.data?.length > 0) {
                            const deleteCmd = `DELETE FROM ${getTableName}.cacheRule
                                               WHERE screenbuilderid = '${instance?.screenbuilderid}'
                                                 AND applicationId = '${appId}'
                                                 AND name = '${type}'
                                                 AND ruleid = '${instance?.id}'`;
                            const result = await this.crateDbService.executeQuery(deleteCmd);

                            if (result.rowcount === 0) {
                                console.log(`No ${type} records matched the criteria.`);
                            } else {
                                console.log(`Deleted ${result.rowcount} ${type} records.`);
                            }
                        }
                    }
                    break;

                case 'create':
                    const insertCmd = `INSERT INTO ${getTableName}.cacheRule (id,screenbuilderid, name, data, applicationId, ruleid)
                                       VALUES ('${id}','${instance?.screenbuilderid}', '${type}', '${JSON.stringify(instance)}', '${appId}', '${instance.id}')`;
                    const insertedInstance = await this.crateDbService.executeQuery(insertCmd);
                    break;
            }
        } else {
            if (actionType === 'delete') {
                const deleteCmd = `DELETE FROM ${getTableName}.cacheRule
                                   WHERE applicationid = '${appId}'
                                     AND name = '${type}'
                                     AND ruleid = '${instance}'`;
                const result = await this.crateDbService.executeQuery(deleteCmd);

                if (result.rowcount === 0) {
                    console.log(`No ${type} records matched the criteria.`);
                } else {
                    console.log(`Deleted ${result.rowcount} ${type} records.`);
                }
            }
        }
    }

    async actionCRUD(data: any[], appId: string, screenbuilderid: string, modelType: string): Promise<ApiResponse<any>> {
        try {
            // Get existing records based on applicationId and screenbuilderid
            const existingRecords = await this.crateDbService.executeQuery(
                `SELECT * FROM ${modelType} WHERE screenbuilderid = '${screenbuilderid}'`
            );

            // Create a map of existing records for quick lookups
            const existingRecordsMap = new Map();
            existingRecords?.data?.forEach(record => {
                existingRecordsMap.set(`${record.screenbuilderid}-${record.id}`, record);
            });

            // Initialize arrays for insert, update, and delete operations
            const toInsert = [];
            const toUpdate = [];
            const toDelete = [];

            // Process each data item
            data.forEach(item => {
                const key = `${item.screenbuilderid}-${item?.id}`;
                const existingRecord = existingRecordsMap.get(key);

                if (existingRecord) {
                    // If id exists in the data (Body), update the record
                    if (!item.id) {
                        toDelete.push(existingRecord);
                    } else {
                        if (item.id) {
                            toUpdate.push(item);
                        }
                    }
                    // Remove the record from the map to mark it as processed
                    existingRecordsMap.delete(key);
                } else {
                    const id = uuidv4();
                    let inserModel = item;
                    inserModel['id'] = id;
                    // If the record doesn't exist, insert it
                    toInsert.push(inserModel);
                }
            });

            // Any records remaining in existingRecordsMap should be deleted
            toDelete.push(...existingRecordsMap.values());

            // Execute the insert, update, and delete operations
            let insertResult;
            if (toInsert.length > 0) {
                const valuesString = toInsert.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
                const insertQuery = `INSERT INTO  ${modelType} (${Object.keys(toInsert[0]).join(', ')}) VALUES ${valuesString} RETURNING *`;
                insertResult = await this.crateDbService.executeQuery(insertQuery);
            }

            const updateResult = await Promise.all(
                toUpdate.map(async updateData => {
                    const { id, ...update } = updateData;
                    const updateQuery = `UPDATE  ${modelType} SET ${Object.entries(update).map(([key, value]) => `${key} = '${value}'`).join(', ')} WHERE id = '${id}'  RETURNING *`;
                    return this.crateDbService.executeQuery(updateQuery);
                })
            );

            const deleteResult = await Promise.all(
                toDelete.map(async record => {
                    const deleteQuery = `DELETE FROM  ${modelType} WHERE id = '${record.id}'`;
                    return this.crateDbService.executeQuery(deleteQuery);
                })
            );

            return new ApiResponse(true, 'Data Saved', {
                inserted: insertResult,
                updated: updateResult,
                deleted: deleteResult,
            });
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }

    async actionRuleCRUD(data: any, appId: string, screenbuilderid: string, modelType: string): Promise<ApiResponse<any>> {
        try {
            // Get existing records based on applicationId and screenbuilderid
            const existingRecords = await this.crateDbService.executeQuery(`SELECT * FROM ${modelType} WHERE screenbuilderid = '${screenbuilderid}'`);
            // const getTableName = modelType.split('.')?.[0];
            // let insertResult;
            // let toUpdate;
            // // const deleteResult = await Promise.all(
            // //     toDelete.map(async record => {
            // //         const updateRecord = {
            // //             json: record
            // //         };
            // //         this.cacheRuleManagement(modelType, appId, 'delete', updateRecord, false);
            // //         const deleteQuery = `DELETE FROM ${modelType} WHERE id = '${record.id}'`;
            // //         return this.crateDbService.executeQuery(deleteQuery);
            // //     })
            // // );
            // if (existingRecords?.data?.length > 0) {
            //     const updateResult = await Promise.all(
            //         [data].map(async updateData => {
            //             const { id, ...update } = updateData;
            //             const updateQuery = `UPDATE ${modelType} SET ${Object.entries(update).map(([key, value]) => `${key} = '${value}'`).join(', ')} WHERE screenbuilderid = '${screenbuilderid}'  and applicationid  = '${appId}' RETURNING *`;
            //             toUpdate = await this.crateDbService.executeQuery(updateQuery);
            //         })
            //     );
            // } else {
            //     const id = uuidv4();
            //     data['id'] = id;
            //     const valuesString = [data].map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
            //     const insertQuery = `INSERT INTO ${modelType} (${Object.keys([data][0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
            //     insertResult = await this.crateDbService.executeQuery(insertQuery);
            // }
            // const cacheRule = await this.crateDbService.executeQuery(`SELECT * FROM ${getTableName}.cacherule WHERE screenbuilderid = '${screenbuilderid}' AND name = '${modelType}'`);

            // if (cacheRule?.data?.length > 0) {
            //     const updateResult = await Promise.all(
            //         toUpdate?.data.map(async updateData => {
            //             const update = {
            //                 name:modelType,
            //                 applicationid:appId,
            //                 screenbuilderid:screenbuilderid,
            //                 data:JSON.stringify(updateData)
            //             }
            //             const updateQuery = `UPDATE ${getTableName}.cacherule SET ${Object.entries(update).map(([key, value]) => `${key} = '${value}'`).join(', ')} WHERE screenbuilderid = '${screenbuilderid}'  and applicationid  = '${appId}' AND name = '${modelType}' RETURNING *`;
            //             return this.crateDbService.executeQuery(updateQuery);
            //         })
            //     );
            // } else {
            //     const id = uuidv4();
            //     const getData  = insertResult ? insertResult?.data?.[0] : toUpdate?.data?.[0];
            //     const obj = {
            //         id: id,
            //         name:modelType,
            //         applicationid:appId,
            //         screenbuilderid:screenbuilderid,
            //         data:getData
            //     }
            //     const valuesString = [obj].map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
            //     const insertQuery = `INSERT INTO ${getTableName}.cacherule (${Object.keys([obj][0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
            //     insertResult = await this.crateDbService.executeQuery(insertQuery);
            // }
            // return new ApiResponse(true, 'Data Saved');

            // Create a map of existing records for quick lookups
            const existingRecordsMap = new Map();
            existingRecords?.data.forEach(record => {
                existingRecordsMap.set(`${record.screenbuilderid}-${record.id}`, record);
            });

            // Initialize arrays for insert, update, and delete operations
            const toInsert = [];
            const toUpdate = [];
            const toDelete = [];

            // Process each data item
            data.forEach(item => {
                const key = `${item.screenbuilderid}-${item?.id}`;
                const existingRecord = existingRecordsMap.get(key);

                if (existingRecord) {
                    // If id exists in the data (Body), update the record
                    if (!item.id) {
                        toDelete.push(existingRecord);
                    } else {
                        if (item.id) {
                            toUpdate.push(item);
                        }
                    }
                    // Remove the record from the map to mark it as processed
                    existingRecordsMap.delete(key);
                } else {
                    const id = uuidv4();
                    let inserModel = item;
                    inserModel['id'] = id;
                    // If the record doesn't exist, insert it
                    toInsert.push(inserModel);
                }
            });

            // Any records remaining in existingRecordsMap should be deleted
            toDelete.push(...existingRecordsMap.values());

            // Execute the insert, update, and delete operations
            let insertResult;
            if (toInsert.length > 0) {
                const valuesString = toInsert.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
                const insertQuery = `INSERT INTO ${modelType} (${Object.keys(toInsert[0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
                insertResult = await this.crateDbService.executeQuery(insertQuery);
            }

            const updateResult = await Promise.all(
                toUpdate.map(async updateData => {
                    const { id, ...update } = updateData;
                    // const updateRecord = {
                    //     json: updateData
                    // };
                    const updateQuery = `UPDATE ${modelType} SET ${Object.entries(update).map(([key, value]) => `${key} = '${value}'`).join(', ')} WHERE id = '${id}'  RETURNING *`;
                    const execQuery = await this.crateDbService.executeQuery(updateQuery);
                    this.cacheRuleManagement(modelType, appId, 'update', execQuery?.data[0], false);
                    return execQuery;
                })
            );

            const deleteResult = await Promise.all(
                toDelete.map(async record => {
                    // const updateRecord = {
                    //     json: record
                    // };
                    this.cacheRuleManagement(modelType, appId, 'delete', record, false);
                    const deleteQuery = `DELETE FROM ${modelType} WHERE id = '${record.id}'`;
                    return this.crateDbService.executeQuery(deleteQuery);
                })
            );

            // Execute cache rule management
            if (insertResult && insertResult?.data?.length > 0) {
                for (const item of insertResult.data) {
                    this.cacheRuleManagement(modelType, appId, 'create', item, false);
                }
            }

            return new ApiResponse(true, 'Data Saved', {
                inserted: insertResult,
                updated: updateResult,
                deleted: deleteResult,
            });
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }
    async emailTemplateCRUD(data: any, appId: string, modelType: string): Promise<ApiResponse<any>> {
        try {
            // Get existing records based on applicationId and screenbuilderid
            const existingRecords = await this.crateDbService.executeQuery(`SELECT * FROM ${modelType} WHERE applicationid = '${appId}'`);

            // Create a map of existing records for quick lookups
            const existingRecordsMap = new Map();
            existingRecords?.data.forEach(record => {
                existingRecordsMap.set(`${record.id}`, record);
            });

            // Initialize arrays for insert, update, and delete operations
            const toInsert = [];
            const toUpdate = [];
            const toDelete = [];

            // Process each data item
            data.forEach(item => {
                const key = `${item?.id}`;
                const existingRecord = existingRecordsMap.get(key);

                if (existingRecord) {
                    // If id exists in the data (Body), update the record
                    if (!item.id) {
                        toDelete.push(existingRecord);
                    } else {
                        if (item.id) {
                            toUpdate.push(item);
                        }
                    }
                    // Remove the record from the map to mark it as processed
                    existingRecordsMap.delete(key);
                } else {
                    const id = uuidv4();
                    let inserModel = item;
                    inserModel['id'] = id;
                    // If the record doesn't exist, insert it
                    toInsert.push(inserModel);
                }
            });

            // Any records remaining in existingRecordsMap should be deleted
            toDelete.push(...existingRecordsMap.values());

            // Execute the insert, update, and delete operations
            let insertResult;
            if (toInsert.length > 0) {
                const valuesString = toInsert.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
                const insertQuery = `INSERT INTO ${modelType} (${Object.keys(toInsert[0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
                insertResult = await this.crateDbService.executeQuery(insertQuery);
            }

            const updateResult = await Promise.all(
                toUpdate.map(async updateData => {
                    const { id, ...update } = updateData;
                    // const updateRecord = {
                    //     json: updateData
                    // };
                    const updateQuery = `UPDATE ${modelType} SET ${Object.entries(update).map(([key, value]) => `${key} = '${value}'`).join(', ')} WHERE id = '${id}'  RETURNING *`;
                    const execQuery = await this.crateDbService.executeQuery(updateQuery);
                    this.cacheRuleManagement(modelType, appId, 'update', execQuery?.data[0], false);
                    return execQuery;
                })
            );

            const deleteResult = await Promise.all(
                toDelete.map(async record => {
                    // const updateRecord = {
                    //     json: record
                    // };
                    this.cacheRuleManagement(modelType, appId, 'delete', record, false);
                    const deleteQuery = `DELETE FROM ${modelType} WHERE id = '${record.id}'`;
                    return this.crateDbService.executeQuery(deleteQuery);
                })
            );

            // Execute cache rule management
            if (insertResult && insertResult?.data?.length > 0) {
                for (const item of insertResult.data) {
                    this.cacheRuleManagement(modelType, appId, 'create', item, false);
                }
            }

            return new ApiResponse(true, 'Data Saved', {
                inserted: insertResult,
                updated: updateResult,
                deleted: deleteResult,
            });
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }


    async policyMappingCRUD(data: any, appId: string, modelType: string, policyId: string): Promise<ApiResponse<any>> {
        try {
            const { query, values } = this.queryGenratorService.generateInsertQuery(`${DB_CONFIG.CRATEDB.mode}meta.policymappingnew`, data);
            console.log(query)
            const savedInstance = await this.crateDbService.executeQuery(query);
            return new ApiResponse(true, 'asdsadas');
            // // Get existing records based on policyId
            // const allPolicySet = new Set(data.map(d => d.policyid));
            // const allPolicyArray = Array.from(allPolicySet);
            // const allPolicyString = allPolicyArray.map(policyid => `'${policyid}'`).join(', ');

            // const getQuery = `SELECT * FROM ${modelType} WHERE policyId IN (${allPolicyString}) AND applicationid = '${appId}';`;
            // const existingRecords = await this.crateDbService.executeQuery(getQuery);
            // if(existingRecords){

            // }else{

            // }

            // // Create a map of existing records for quick lookups
            // const existingRecordsMap = new Map();
            // existingRecords?.data?.forEach(record => {
            //     existingRecordsMap.set(`${record.policyid}-${record?.id}`, record);
            // });

            // // Initialize arrays for insert, update, and delete operations
            // const toInsert = [];
            // const toUpdate = [];
            // const toDelete = [];

            // // Process each data item
            // data.forEach(item => {
            //     const key = `${item.policyid}-${item?.id}`;
            //     const existingRecord = existingRecordsMap.get(key);
            //     const propertiesToDelete = ['icon', 'iconcolor', 'iconsize', 'icontype', 'istitle', 'key', 'link',
            //         'selected', 'title', 'type', 'expand', 'expanded', 'iconright', 'tooltip'
            //     ];
            //     item = Object.fromEntries(Object.entries(item).filter(([key]) => !propertiesToDelete.includes(key)));

            //     if (existingRecord) {
            //         // If id exists in the data (Body), update the record
            //         if (!(item.creates || item.updates || item.deletes || item.reades)) {
            //             toDelete.push(existingRecord);
            //         } else {
            //             if (item.id) {
            //                 toUpdate.push(item);
            //             }
            //         }
            //         // Remove the record from the map to mark it as processed
            //         existingRecordsMap.delete(key);
            //     } 
            //     else {
            //         if (typeof Array(item.children)) {
            //             item.children = { json: JSON.stringify(item.children) };
            //         }
            //         item.children = JSON.stringify(item.children);
            //         const id = uuidv4();
            //         item['id'] = id;
            //         // If the record doesn't exist, insert it
            //         toInsert.push(item);
            //     }
            // });

            // // Any records remaining in existingRecordsMap should be deleted
            // toDelete.push(...existingRecordsMap.values());

            // // Execute the insert, update, and delete operations
            // let insertResult;
            // if (toInsert.length > 0) {

            //     const valuesString = toInsert.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
            //     const insertQuery = `INSERT INTO ${modelType} (${Object.keys(toInsert[0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
            //     console.log(insertQuery)
            //     // insertResult = await this.crateDbService.executeQuery(insertQuery);

            // }

            // const updateResult = await Promise.all(
            //     toUpdate.map(async updateData => {
            //         const { id, ...update } = updateData;
            //         const updateQuery = `UPDATE ${modelType} SET ${Object.entries(update).map(([key, value]) => `${key} = '${value}'`).join(', ')} WHERE id = '${id}'  RETURNING *`;
            //         return this.crateDbService.executeQuery(updateQuery);
            //     })
            // );

            // const deleteResult = await Promise.all(
            //     toDelete.map(async record => {
            //         const deleteQuery = `DELETE FROM ${modelType} WHERE id = '${record.id}'`;
            //         return this.crateDbService.executeQuery(deleteQuery);
            //     })
            // );

            // return new ApiResponse(true, 'Data Saved', {
            //     inserted: insertResult,
            //     updated: updateResult,
            //     deleted: deleteResult,
            // });
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }

    // async getByDomain(modelType: string, id: string, userId: string): Promise<any> {
    //     try {
    //         const getTableName = modelType.split('.')[0].toLowerCase();

    //         const getApp = `select * from ${getTableName}.application where domains =  '${id}'`;
    //         const executeApp = await this.crateDbService.executeQuery(getApp);
    //         if (executeApp.isSuccess && executeApp?.data?.length > 0) {
    //             const appDetail = executeApp.data[0];

    //             const depart = `select * from ${getTableName}.department where id  = '${appDetail.departmentid}'`;
    //             const executeDepart = await this.crateDbService.executeQuery(getApp);

    //             if (executeDepart.isSuccess && executeDepart?.data?.length > 0) {

    //             }
    //         }

    //     } catch (error) {

    //     }
    // }

    async getByDomain(modelType: string, id: string, userId: string): Promise<ApiResponse<any>> {
        try {
            const getTableName = modelType.split('.')[0].toLowerCase();

            // Query to retrieve data from the specified model based on domain or id
            const instanceQuery = `SELECT * FROM ${getTableName}.application WHERE domains ='${id}'`;

            const instanceResult = await this.crateDbService.executeQuery(instanceQuery);

            if (!instanceResult.isSuccess && !instanceResult?.data) {
                return new ApiResponse(false, 'No data found');
            }

            const instance = instanceResult.data?.[0];

            // Query to retrieve department data
            const findDepartmentQuery = `SELECT *  FROM ${getTableName}.department WHERE id = '${instance.departmentid}' `;

            const findDepartmentResult = await this.crateDbService.executeQuery(findDepartmentQuery);

            const findDepartment = findDepartmentResult.data?.length > 0 ? findDepartmentResult.data[0] : undefined;

            // Query to retrieve menu data
            const menuQuery = `SELECT * FROM  ${getTableName}.menu WHERE applicationid = '${instance.id}'`;

            const menuResult = await this.crateDbService.executeQuery(menuQuery);

            const menu = menuResult.data?.length > 0 ? menuResult.data[0] : undefined;

            // Query to retrieve user mapping data
            let userMappingQuery = ` SELECT * FROM  ${getTableName}.usermapping  WHERE userId = '${userId}'`;

            let userMappingResult = await this.crateDbService.executeQuery(userMappingQuery);

            const userMapping = userMappingResult.data?.length > 0 ? userMappingResult.data : undefined;
            // Query to retrieve defaultScreens
            const defaultScreensQuery = `SELECT * FROM ${getTableName}.builders WHERE applicationId ='${instance.id}' AND (screenName ILIKE '%_header%' OR screenName ILIKE '%_footer%' OR screenName ILIKE '%default%')
`;
            const defaultScreensResult = await this.crateDbService.executeQuery(defaultScreensQuery);

            let objLayout = defaultScreensResult.data?.length > 0
                ? defaultScreensResult.data.reduce((result, screen) => {
                    const screenName = screen.screenname.toLowerCase();
                    if (screenName.includes('_header')) {
                        result['header'] = screen;
                    } else if (screenName.includes('_footer')) {
                        result['footer'] = screen;
                    } else if (screenName.includes('default')) {
                        result['default'] = screen;
                    }
                    return result;
                }, {})
                : {};

            // Query to retrieve applicationClasses
            const applicationClassesQuery = ` SELECT * FROM ${getTableName}.applicationglobalclass WHERE applicationId = '${instance.id}' `;
            const applicationClassesResult = await this.crateDbService.executeQuery(applicationClassesQuery);

            const applicationClasses = applicationClassesResult.data?.length > 0
                ? applicationClassesResult.data
                : [];
            objLayout['appication'] = instance;
            objLayout['menu'] = menu;
            objLayout['department'] = findDepartment;
            objLayout['applicationGlobalClasses'] = applicationClasses;

            if (userMapping && menu) {
                // Fetch policyMenu data using a CrateDB-compatible query
                const policyMenuQuery = `
                        SELECT * FROM ${getTableName}.policymapping WHERE policyId  = '${userMapping[0]?.policyid}'`;
                const policyMenuResult = await this.crateDbService.executeQuery(policyMenuQuery);
                const policyMenu = policyMenuResult.data?.length > 0 ? policyMenuResult.data : [];

                const parsedMenuData : any = JSON.parse(JSON.stringify(menu.menudata?.json)); // Assuming it's the first element
                let nonRelationalData: any = this.flattenArray(policyMenu[0]?.data?.json);
                const matchingMenus = this.filterMenusWithPolicy(nonRelationalData, parsedMenuData);
                objLayout['menu'].menudata = { json: matchingMenus };
            }
            return new ApiResponse(true, 'Data Retrieved', objLayout);

        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }

    async getBuilderMenu(modelType: string, id: string, organizationId, appId, userId): Promise<ApiResponse<any>> {
        try {
            const getTableName = modelType.split('.')[0].toLowerCase();

            const instanceQuery = `  SELECT *  FROM ${getTableName}.menu  WHERE  applicationid = '${appId}'`;

            const instanceResult = await this.crateDbService.executeQuery(instanceQuery);

            const userMappingQuery = `SELECT * FROM ${getTableName}.usermapping WHERE userid = '${userId}'`;

            const userMappingResult = await this.crateDbService.executeQuery(userMappingQuery);

            const policyId = userMappingResult?.data?.[0].policyid;

            const policyQuery = `SELECT * FROM ${getTableName}.policy WHERE id = '${policyId}'`;

            const getPolicyResult = await this.crateDbService.executeQuery(policyQuery);

            const themeId = getPolicyResult?.data?.[0].menuthemeid

            const menuThemeQuery = `SELECT theme FROM ${getTableName}.menutheme WHERE id = '${themeId}'`;

            const getPolicyThemeResult = await this.crateDbService.executeQuery(menuThemeQuery);


            const policyMappingQuery = `SELECT menuid FROM ${getTableName}.policymapping WHERE policyid IN (${userMappingResult?.data.map(p => `'${p.policyid}'`).join(',')})`;


            if (instanceResult.data.length > 0 && userMappingResult.data?.length > 0) {
                const instance = instanceResult.data[0];
                const userMapping = userMappingResult.data;
                const policy = userMapping[0].policyid;


                if (getPolicyResult.data?.length > 0) {
                    const getPolicy = getPolicyResult.data[0];
                    const themeId = getPolicy.menuthemeid;

                    if (themeId) {

                        if (getPolicyThemeResult.data?.length > 0) {
                            const getPolicyTheme = getPolicyThemeResult.data[0];
                            const theme = getPolicyTheme.theme;
                            const oldTheme = instance.selectedtheme;

                            const updateTheme = { ...oldTheme, ...theme };
                            instance.selectedtheme = updateTheme;
                        }
                    }

                    const policyMappingResult = await this.crateDbService.executeQuery(policyMappingQuery);

                    if (policyMappingResult.data?.length > 0) {
                        const policyMenuIds = policyMappingResult.data.map(p => p.menuid);
                        const parsedMenuData = instance.menudata?.json;

                        const matchingMenus = parsedMenuData.filter(menu => policyMenuIds.includes(menu.id));

                        instance.menudata = matchingMenus;
                    }
                    return new ApiResponse(true, 'Data Retrieved', instance);
                }
            }
            // Your updated instance object is now in the 'instance' variable

        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }

    async sampleScreen(modelType): Promise<any> {
        try {
            const getTableName = modelType.split('.')[0].toLowerCase();

            // Query to retrieve data from the specified model based on domain or id
            const instanceQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.defaultapplication WHERE name  ='sampleScreen'`;

            const instanceResult = await this.crateDbService.executeQuery(instanceQuery);

            return instanceResult;
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }
    async cloneApplicationData(modelType): Promise<ApiResponse<any[]>> {
        try {
            const getTableName = modelType.split('.')[0].toLowerCase();

            // Query to retrieve data from the specified model based on domain or id
            const instanceQuery = `SELECT * FROM ${getTableName}.application WHERE departmentId ='64abfe2776ac2e992aa14d81'`;

            const instanceResult = await this.crateDbService.executeQuery(instanceQuery);

            return new ApiResponse(true, 'Data Retrieved', instanceResult);
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }

    async appDelete(modelType): Promise<ApiResponse<any[]>> {
        try {
            // Query to retrieve data from the specified model based on domain or id
            const instanceQuery = `delete from ${DB_CONFIG.CRATEDB.mode}meta.menu  where applicationid ='${modelType}';
            delete from ${DB_CONFIG.CRATEDB.mode}meta.policymapping  where applicationid ='${modelType}';
            delete from ${DB_CONFIG.CRATEDB.mode}meta.policy  where applicationid ='${modelType}';
            delete from ${DB_CONFIG.CRATEDB.mode}meta.screenbuilder  where applicationid ='${modelType}';
            delete from ${DB_CONFIG.CRATEDB.mode}meta.users  where applicationid ='${modelType}';
            delete from ${DB_CONFIG.CRATEDB.mode}meta.builders  where applicationid ='${modelType}';
            delete from ${DB_CONFIG.CRATEDB.mode}meta.usermapping  where applicationid ='${modelType}';
            delete from ${DB_CONFIG.CRATEDB.mode}meta.application where id ='${modelType}';`;

            const instanceResult = await this.crateDbService.executeQuery(instanceQuery);

            return new ApiResponse(true, 'Data Retrieved', instanceResult);
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }

    async defaultApplication(body): Promise<ApiResponse<any[]>> {
        const id = uuidv4();
        if (body?.data?.menudata) {
            const screenData = body.data.menudata;
            body.data.menudata = JSON.stringify(screenData);
        }
        else if (body?.data?.screendata) {
            const screenData = body.data.screendata;
            body.data.screendata = JSON.stringify(screenData);
        }
        // body.data  = JSON.stringify(body.data);
        const insertCmd = `INSERT INTO ${DB_CONFIG.CRATEDB.mode}met.defaultapplication (id,name, data) VALUES ('${id}','${body?.name}', '${JSON.stringify(body.data)}')`;
        const insertedInstance = await this.crateDbService.executeQuery(insertCmd);
        return insertedInstance;

    }
    async testing(body): Promise<ApiResponse<any[]>> {

        const instanceQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}met.defaultapplication where name  IN('headerBuilderScreen','defaultBuilderScreen','footerBuilderScreen') `;

        const instanceResult = await this.crateDbService.executeQuery(instanceQuery);
        let defaultApplication = instanceResult?.data
        let menus;
        let selectedBuilderNames = ['headerBuilderScreen', 'defaultBuilderScreen', 'footerBuilderScreen'];
        const defaultBuilderScreen: any[] = defaultApplication.filter(item => selectedBuilderNames.includes(item.name)).map((item: any) => {
            // Create a shallow copy of the data object
            const newData = { ...item.data };
            // newData.screendata = JSON.parse(newData.screendata)
            return newData;
        });
        const createDefaultScreen = await this.crateDbService.executeQuery(`SELECT * FROM ${DB_CONFIG.CRATEDB.mode}met.screenbuilder where applicationid = 'c9fd6466-dbc5-4a65-ace0-2967f98bf103'`);
        let updatedData = defaultBuilderScreen.map(item1 => {
            const matchedItem = createDefaultScreen?.data.find(item2 => item2.navigation === item1.navigation);
            if (matchedItem) {
                const id = uuidv4();
                item1['id'] = id;
                item1.screenbuilderid = matchedItem.id;
                item1.applicationid = '5e486b78-b5c9-47ec-a651-b41ffc325cc4';
                item1.screendata = JSON.parse(item1.screendata);
                return item1;
            }
        });
        let createdefaultBuilderScreen;
        if (defaultBuilderScreen.length > 0 && createDefaultScreen && updatedData) {
            const valuesString = this.queryGenratorService.convertObjectToStringInsertMultiple(defaultBuilderScreen);
            // const valuesString = updatedData.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
            const insertQuery = `INSERT INTO ${DB_CONFIG.CRATEDB.mode}met.builders (${Object.keys(updatedData[0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
            createdefaultBuilderScreen = await this.crateDbService.executeQuery(insertQuery);
        }


        return menus;

    }
    async getUserPolicyMenu(appId: string, policyId: string): Promise<ApiResponse<any>> {
        try {
            const instanceQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}met.policymapping where policyid = ${policyId} AND applicationid = ${appId} `;

            const instanceResult = await this.crateDbService.executeQuery(instanceQuery);
            return new ApiResponse(true, 'Data Retrived', instanceResult);

        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }

    async supperAdminCreate(body, newApp: any, newAppId: any): Promise<ApiResponse<any[]>> {
        try {
            const newApplication = newApp?.data[0];

            const keys = Object.keys(body);
            const tablename = keys[0];
            const onlytableName = tablename?.split('.')?.[1];
            const dbType = tablename?.split('.')?.[0];
            const bodyData = body[tablename];

            const departmen = `SELECT * FROM ${dbType}.department WHERE id ='${newApplication?.departmentid}'`;

            const organization = await this.crateDbService.executeQuery(departmen);

            const instanceQuery = `SELECT * FROM ${dbType}.defaultapplication`;

            const instanceResult = await this.crateDbService.executeQuery(instanceQuery);
            let defaultApplication = instanceResult?.data
            // Assuming newApplication[0].departmentId is the parameter for the WHERE clause
            const departmentIdParam = newApplication?.departmentid;


            // Insert into superAdminMenu
            let menus;
            let superAdminMenu: any = defaultApplication.find((menu: any) => menu.name == 'superAdminMenu')?.data;
            if (superAdminMenu) {
                // const id = uuidv4();
                // superAdminMenu.id = id;
                superAdminMenu['applicationid'] = newAppId;
                superAdminMenu['name'] = newApplication.departmentid;
                superAdminMenu['menudata'] = superAdminMenu['menudata'];
                superAdminMenu['selectedtheme'] = superAdminMenu['selectedtheme'];
                const { query, values } = this.queryGenratorService.generateInsertQuery(`${dbType}.menu`, superAdminMenu);
                menus = await this.crateDbService.executeQuery(query);
            }

            // Insert into superAdminUser
            let superAmdminUser: any = defaultApplication.find((menu: any) => menu.name == 'superAmdminUser')?.data;

            // Hash the password before insertion
            const hashedPassword = await this.hashService.hashPassword(bodyData?.password);
            let createUser: any;
            if (superAmdminUser) {
                // const id = uuidv4();
                // superAmdminUser.id = id;
                superAmdminUser.password = hashedPassword;
                superAmdminUser['applicationid'] = newAppId;
                superAmdminUser['organizationid'] = organization?.data?.[0].organizationid;
                const userName = newApplication.email;
                superAmdminUser.email = userName;
                superAmdminUser.username = userName;
                const { query, values } = this.queryGenratorService.generateInsertQuery(`${dbType}.users`, superAmdminUser);
                createUser = await this.crateDbService.executeQuery(query);
            }

            // Insert into superAdminPolicy
            let superAdminPolicy: any = defaultApplication.find((menu: any) => menu.name == 'superAdminPolicy')?.data;

            // Parameters for the superAdminPolicy insertion
            let createPolicy: any;
            if (superAdminPolicy) {
                // const id = uuidv4();
                // superAdminPolicy.id = id;
                superAdminPolicy['applicationid'] = newAppId;
                const { query, values } = this.queryGenratorService.generateInsertQuery(`${dbType}.policy`, superAdminPolicy);
                createPolicy = await this.crateDbService.executeQuery(query);
            }

            // <--------------------Assign policy to Super admin-------------------->
            let userMapping;
            let superAdminPolicyAssign: any = defaultApplication.find((menu: any) => menu.name == 'superAdminPolicyAssign')?.data;
            if (createPolicy && createUser && superAdminPolicyAssign) {
                // const id = uuidv4();
                // superAdminPolicyAssign.id = id;
                superAdminPolicyAssign['policyid'] = createPolicy?.data?.[0].id;
                superAdminPolicyAssign['userid'] = createUser?.data?.[0].id;
                superAdminPolicyAssign['applicationid'] = newAppId;
                const { query, values } = this.queryGenratorService.generateInsertQuery(`${dbType}.usermapping`, superAdminPolicyAssign);
                userMapping = await this.crateDbService.executeQuery(query);
            }


            // Insert into superAdminPolicyRoles
            let policymapping;
            let superAdminPolicyRoles: any = defaultApplication.find((menu: any) => menu.name == 'superAdminPolicyRoles')?.data;
            if (superAdminPolicyRoles) {
                const modifiedRoles = superAdminPolicyRoles?.json.map((role: any) => {
                    const id = uuidv4();
                    role['id'] = id;
                    return {
                        ...role,
                        policyid: createPolicy?.data?.[0].id,
                        applicationid: newAppId,
                    };
                });
                const savePolicyMappingObj = {
                    policyid: createPolicy?.data?.[0].id,
                    applicationid: newAppId,
                    data: JSON.stringify(superAdminPolicyRoles)
                }
                // const valuesString = modifiedRoles.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
                // const insertQuery = `INSERT INTO ${dbType}.policymapping (${Object.keys(modifiedRoles[0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
                const { query, values } = this.queryGenratorService.generateInsertQuery(`${dbType}.policymapping`, savePolicyMappingObj);

                policymapping = await this.crateDbService.executeQuery(query);

            }


            // Insert into defaultScreen
            let selectedNames = ['defaultHeaderScreen', 'defaultFooterScreen', 'defaultScreen'];
            let createDefaultScreen;
            const defaultScreen: any[] = defaultApplication
                .filter(item => selectedNames.includes(item.name))
                .map((item: any) => {
                    const newData = { ...item.data };
                    const id = uuidv4();
                    newData['id'] = id;
                    // Update the properties you want to change
                    newData.departmentid = newApplication.departmentid;
                    newData.applicationid = newAppId;
                    newData.organizationid = organization?.data?.[0]?.organizationid;

                    return newData;
                });

            if (defaultScreen.length > 0) {
                const valuesString = defaultScreen.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
                const insertQuery = `INSERT INTO ${dbType}.screenbuilder (${Object.keys(defaultScreen[0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
                createDefaultScreen = await this.crateDbService.executeQuery(insertQuery);
            }

            // <--------------------Default Screen Builder-------------------->
            let selectedBuilderNames = ['headerBuilderScreen', 'defaultBuilderScreen', 'footerBuilderScreen'];
            const defaultBuilderScreen: any[] = defaultApplication.filter(item => selectedBuilderNames.includes(item.name)).map((item: any) => {
                // Create a shallow copy of the data object
                const newData = { ...item.data };
                // newData.screendata = JSON.parse(newData.screendata)
                return newData;
            });
            let updatedData = defaultBuilderScreen.map(item1 => {
                const matchedItem = createDefaultScreen?.data.find(item2 => item2.navigation === item1.navigation);
                if (matchedItem) {
                    const date = new Date()
                    const id = uuidv4();
                    item1['id'] = id;
                    item1['createddate'] = date.toISOString();
                    item1.screenbuilderid = matchedItem.id;
                    item1.applicationid = newAppId;
                    item1.screendata = JSON.parse(item1.screendata);
                    return item1;
                }
            });
            let createdefaultBuilderScreen;
            if (defaultBuilderScreen.length > 0 && createDefaultScreen && updatedData) {
                const valuesString = this.queryGenratorService.convertObjectToStringInsertMultiple(defaultBuilderScreen);
                // const valuesString = updatedData.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
                const insertQuery = `INSERT INTO ${DB_CONFIG.CRATEDB.mode}met.builders (${Object.keys(updatedData[0]).join(', ')}) VALUES ${valuesString}  RETURNING *`;
                createdefaultBuilderScreen = await this.crateDbService.executeQuery(insertQuery);
            }
            // <--------------------Create Default Policy-------------------->
            let defaultPolicy: any = defaultApplication.find((menu: any) => menu.name == 'defaultPolicy')?.data;
            let createDefaultPolicy: any;
            if (defaultPolicy) {
                defaultPolicy['applicationid'] = newAppId;
                const { query, values } = this.queryGenratorService.generateInsertQuery(`${dbType}.policy`, defaultPolicy);
                createDefaultPolicy = await this.crateDbService.executeQuery(query);
            }
            console.log('createDefaultPolicy : ' + createDefaultPolicy)

            // <--------------------Assign Default Policy Roles-------------------->
            let defaultPolicyRoles: any = defaultApplication.find((menu: any) => menu.name == 'defaultPolicyRoles')?.data;
            if (defaultPolicyRoles) {
                const modifiedDefaultPolicyRoles = defaultPolicyRoles?.json.map((role: any) => {
                    const id = uuidv4();
                    role['id'] = id;
                    return {
                        ...role,
                        policyid: createDefaultPolicy?.data[0].id,
                        applicationid: newAppId,
                    };
                });
                // const valuesString = modifiedDefaultPolicyRoles.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
                const savePolicyMappingObj = {
                    policyid: createDefaultPolicy?.data[0].id,
                    applicationid: newAppId,
                    data: JSON.stringify(defaultPolicyRoles)
                }
                const { query, values } = this.queryGenratorService.generateInsertQuery(`${dbType}.policymapping`, savePolicyMappingObj);

                createDefaultPolicy = await this.crateDbService.executeQuery(query);
            }

            return new ApiResponse(true, 'Data Retrieved', instanceResult);
        } catch (error) {
            return new ApiResponse(false, error.message);
        }


    }

    filterMenusWithPolicy(policydata: any[], menudata: any[]) {
        const policyDataMap = new Map(policydata.map(policy => [policy.menuid, policy]));

        const filterMenus = (menu) => {
            const policy = policyDataMap.get(menu.id);

            if (policy) {
                // Assign hideExpression from policy to menu
                if (policy.hideexpression) {
                    menu.hideExpression = policy.hideexpression;
                } else {
                    menu.hideExpression = false;
                }

                if (menu.children && menu.children.length > 0) {
                    menu.children = menu.children.filter(child => filterMenus(child));
                }

                return true;
            }

            return false;
        };

        return menudata.filter(menu => filterMenus(menu));
    }

    getCurrentTimestamp(): { timestamp: string } {
        const currentTimestamp = new Date().toISOString();
        return { timestamp: currentTimestamp };
    }
    async checkUserScreen(screenId: string, appId: string, userId: string): Promise<ApiResponse<any>> {
        try {
            // let isPremissionAllow = false;
            console.log(`SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.policymapping WHERE screenid = '/pages/${screenId}' AND applicationid = '${appId}';`)
            const res: any = await this.crateDbService.executeQuery(`SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.policymapping WHERE screenid = '/pages/${screenId}' AND applicationid = '${appId}';`);
            // const menu = await this.menuModel.findOne({ applicationId: appId }).exec();
            // const userMapping = await this.userMappingModel.find({ userId });
            // if (userMapping && menu) {
            //     // Find menu mappings associated with the policies
            //     const policyMenu = await this.policyMappingModel.find({
            //         policyId: { $in: userMapping.map(p => p.policyId) },
            //     });
            //     // Parse menuData from the instance
            //     const parsedMenuData = JSON.parse(menu.menuData); // Assuming it's the first element

            //     // Extract menuId values from policyMenu
            //     const policyMenuIds = policyMenu.map(p => p.menuId);
            //     const matchPolicyMenus: any[] = [];

            //     function searchMenus(menus: any[]) {
            //         for (const menuItem of menus) {
            //             if (policyMenuIds.includes(menuItem.id)) {
            //                 matchPolicyMenus.push(menuItem);
            //             }

            //             // If the current menu has children, recursively search through them
            //             if (menuItem.children && menuItem.children.length > 0) {
            //                 searchMenus(menuItem.children);
            //             }
            //         }
            //     }
            //     searchMenus(parsedMenuData);

            //     let findScreen = matchPolicyMenus.find(a => a.link == '/pages/' + screenId);
            //     if (findScreen)
            //         isPremissionAllow = true;
            // }
            let screens: any;
            if (res?.data.length == 0 || !res?.data) {
                console.log(`select * from ${DB_CONFIG.CRATEDB.mode}.builders where applicationid = '${appId}' AND navigation = 'not_found';`)
                screens = await this.crateDbService.executeQuery(`select * from ${DB_CONFIG.CRATEDB.mode}meta.builders where applicationid = '${appId}' AND navigation = 'not_found';`);;
            }

            // console.log(screens)
            return new ApiResponse(true, 'Data Retrieved', true);
            return new ApiResponse(true, 'Data Retrieved', screens || false);
        } catch (error) {
            return new ApiResponse(false, error.message);
        }
    }
    private flattenArray(inputArray: any[]): any[] {
        const flattenedArray = [];
        const stack = [...inputArray];
    
        while (stack.length > 0) {
          const item = stack.pop();
          flattenedArray.push(item);
    
          if (item.children && item.children.length > 0) {
            stack.push(...item.children.reverse());
          }
        }
    
        return flattenedArray;
      }
}
