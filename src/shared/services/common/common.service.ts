import { CrateDbService } from "src/common/common/crateDb.service";
import { DB_CONFIG } from "src/shared/config/global-db-config";

export class CommonService {
    constructor(private crateDbService: CrateDbService) { }

    isTableExit(model) {
        if (model.toLowerCase() == 'actions')
            return `dev_meta.${model}`
    }
    tableList = [
        { key: "actions", value: `${DB_CONFIG.CRATEDB.mode}meta.actions` },
        { key: "actionss", value: `${DB_CONFIG.CRATEDB.mode}meta.actionss` },
        { key: "actionrule", value: `${DB_CONFIG.CRATEDB.mode}meta.actionrule` },
        { key: "organization", value: `${DB_CONFIG.CRATEDB.mode}meta.organization` },
        { key: "department", value: `${DB_CONFIG.CRATEDB.mode}meta.department` },
        { key: "application", value: `${DB_CONFIG.CRATEDB.mode}meta.application` },
        { key: "validationrule", value: `${DB_CONFIG.CRATEDB.mode}meta.validationrule` },
        { key: "users", value: `${DB_CONFIG.CRATEDB.mode}meta.users` },
        { key: "usermapping", value: `${DB_CONFIG.CRATEDB.mode}meta.usermapping` },
        { key: "uirule", value: `${DB_CONFIG.CRATEDB.mode}meta.uirule` },
        { key: "tableschema", value: `${DB_CONFIG.CRATEDB.mode}meta.tableschema` },
        { key: "tables", value: `${DB_CONFIG.CRATEDB.mode}meta.tables` },
        { key: "screenbuilder", value: `${DB_CONFIG.CRATEDB.mode}meta.screenbuilder` },
        { key: "screen", value: `${DB_CONFIG.CRATEDB.mode}meta.screen` },
        { key: "policymapping", value: `${DB_CONFIG.CRATEDB.mode}meta.policymapping` },
        { key: "policy", value: `${DB_CONFIG.CRATEDB.mode}meta.policy` },
        { key: "menutheme", value: `${DB_CONFIG.CRATEDB.mode}meta.menutheme` },
        { key: "menu", value: `${DB_CONFIG.CRATEDB.mode}meta.menu` },
        { key: "gridbusinessrule", value: `${DB_CONFIG.CRATEDB.mode}meta.gridbusinessrule` },
        { key: "defaultapplication", value: `${DB_CONFIG.CRATEDB.mode}meta.defaultapplication` },
        { key: "cacherule", value: `${DB_CONFIG.CRATEDB.mode}meta.cacherule` },
        { key: "businessrule", value: `${DB_CONFIG.CRATEDB.mode}meta.businessrule` },
        { key: "builders", value: `${DB_CONFIG.CRATEDB.mode}meta.builders` },
        { key: "applicationtheme", value: `${DB_CONFIG.CRATEDB.mode}meta.applicationtheme` },
        { key: "applicationglobalclass", value: `${DB_CONFIG.CRATEDB.mode}meta.applicationglobalclass` },
        { key: "emailtemplates", value: `${DB_CONFIG.CRATEDB.mode}meta.emailtemplates` },
        { key: "controls", value: `${DB_CONFIG.CRATEDB.mode}meta.controls` },
        { key: "buildersnew", value: `${DB_CONFIG.CRATEDB.mode}meta.buildersnew` },
        { key: "policymappingnew", value: `${DB_CONFIG.CRATEDB.mode}meta.policymappingnew` },
        // use name as table name  --getpolicy
        { key: "getpolicy", value: `${DB_CONFIG.CRATEDB.mode}meta.getpolicy` },
    ]
    // async findUserPolicyAll(modelType, id: string) {
    //     const query = ` SELECT * FROM ${modelType}.usermapping  WHERE userid = '${id}'`;

    //     const result = await this.crateDbService.executeQuery(query);

    //     // Check if a default policy exists
    //     const defaultPolicy = result.data?.length > 0
    //         ? result.data.find((mapping: any) => mapping.defaultpolicy === true || mapping.defaultpolicy === 'true')
    //         : undefined;

    //     if (defaultPolicy) {
    //         return [defaultPolicy];
    //     }

    //     // If no default policy exists, return the last mapping
    //     if (result.data?.length > 0) {
    //         return [result.data[0]];
    //     }

    //     // If no mappings are found, return undefined or handle it as needed
    //     return;
    // }

}