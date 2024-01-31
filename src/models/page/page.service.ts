import { BadRequestException, ConsoleLogger, Inject, Injectable, Req } from '@nestjs/common';
import { CrateDbService } from 'src/common/common/crateDb.service';
import { ApiResponse } from 'src/shared/entities/common/apiResponse';
import { HashService } from 'src/shared/services/hash/hash.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';
import axios, { AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import { DB_CONFIG, SPECTRUM_CONFIG } from 'src/shared/config/global-db-config';
import { EmailService } from '../email/email.service';
import { TokenService } from '../token/token.service';
const { v4: uuidv4 } = require('uuid');

@Injectable()
export class PageService {
    constructor(private readonly crateDbService: CrateDbService,
        private queryGenratorService: QueryGenratorService,
        private hashService: HashService,
        private emailService: EmailService,
        private tokenService: TokenService,
    ) {


    }

    async executeRules(req, appId: string, orgId: string, user: string, request: any, policyId: string, screenId: string, screenBuildId: string, ruleId: string, data: any, externalLogin: boolean) {
        return await this.processActionRules(req, appId, orgId, user, request, policyId, screenId, screenBuildId, ruleId, data, externalLogin);
    }
    async executeDeleteRules(req, appId: string, orgId: string, user: string, request: any, policyId: string, screenId: string, screenBuildId: string, ruleId: string, data: any, externalLogin: any) {
        return await this.processActionRules(req, appId, orgId, user, request, policyId, screenId, screenBuildId, ruleId, data, externalLogin);
    }
    async getexecuteRules(req, appId: string, orgId: string, user: string, request: string, policyId: string, screenId: string, screenBuildId: string, ruleId: string, parentId?: string, page?: number, pageSize?: number, search?: string, filters?: string, externalLogin?: boolean) {
        return await this.processActionRules(req, appId, orgId, user, request, policyId, screenId, screenBuildId, ruleId, '', externalLogin, parentId, page, pageSize, search, filters);
    }

    async processActionRules(req, appId: string, orgId: string, user: string, request: string, policyId: string, screenId: string, screenBuildId: string, ruleId: string, context?: any, externalLogin?: boolean, parentId?: string, page?: number, pageSize?: number, search?: string, filters?: string) {

        console.log("ActionRule : " + JSON.stringify(ruleId));
        const start = new Date().getTime()
        console.log("ActionRule Start: " + JSON.stringify(new Date()));

        let actionRule = await this.getByRuleId(ruleId, appId);

        console.log("ActionRule Get : " + JSON.stringify(new Date()));

        let actionRules = JSON.parse(actionRule?.[0].rule);

        let actions = await this.getActionByScreenBuilderId(actionRule, appId);

        console.log("Actions Get: " + JSON.stringify(new Date()));

        let actionQueries = [];
        if (actions.length > 0) {
            const getRes = actions.map((x: any) => { return { name: x.qurytype, query: x.quries } });
            actionQueries = getRes;
        }
        console.log("Query Start: " + JSON.stringify(new Date()));
        let message: any;
        const parsedRules = actionRules;
        for (const rule of parsedRules) {
            console.log("rule " + JSON.stringify(rule));
            if (rule?.if) {
                let { actionRule, key, compare, value } = rule.if;
                key = key.replace('$policyId', `'${policyId}'`);
                const checkStaticValue = key == value ? true : false;
                if (actionRule.includes('post_')) {
                    const comparisonFunction = this.getComparisonFunction(compare);
                    if (!checkStaticValue ? comparisonFunction(this.getKeyAssignValue(context, key), value) : checkStaticValue) {
                        if (!externalLogin || externalLogin == undefined) {
                            let getCurrentPolicy = await this.getMappingByPolicyIdAppId(policyId, appId, screenId);
                            if (!getCurrentPolicy.data) {
                                return new ApiResponse(false, "You did not have create authority assign of this screen", []);
                            }
                            const checkCreateAssign = getCurrentPolicy?.data?.find(a => a.creates == true);
                            if (!checkCreateAssign) {
                                return new ApiResponse(false, "You did not have create authority assign of this screen", []);
                            }
                        }

                        const getActionId = actions.find(a => a.qurytype === actionRule);
                        context['ruleId'] = getActionId?.id;
                        message = await this.saveDb(context, screenBuildId, appId, orgId, request, user, [getActionId]);
                        if (message[0]?.error) {
                            return message;
                        }
                        if (rule.then) {
                            const thenActions = rule.then;
                            for (const actionKey in thenActions) {
                                if (thenActions.hasOwnProperty(actionKey)) {
                                    const thenAction = thenActions[actionKey];
                                    const thenActionId = actions.find(a => a.qurytype === thenAction);
                                    if (thenActionId) {
                                        const obj = {
                                            modalData: message[0]
                                        }
                                        if (thenActionId.type == 'email') {
                                            await this.sendEmail11(req, obj, appId, request, thenActionId, user, screenBuildId, actionRule);
                                        } else {
                                            await this.executeDeleteQueries(obj, appId, request, thenActionId, user);
                                        }
                                    }
                                }
                            }
                        }
                        if (rule.OR) {
                            const orActions = rule.OR;
                            for (const actionOr of orActions) {
                                const { actionRule, key, compare, value } = actionOr.if;
                                if (actionRule.includes('post_')) {
                                    const comparisonFunction = this.getComparisonFunction(compare);
                                    if (comparisonFunction(this.getKeyAssignValue(context, key), value)) {
                                        const thenActionId = actions.find(a => a.qurytype === actionRule);
                                        if (thenActionId) {
                                            const obj = {
                                                modalData: message[0]
                                            }
                                            await this.executeDeleteQueries(obj, appId, request, thenActionId, user);
                                        }
                                        if (actionOr.then) {
                                            const thenActions = actionOr.then;
                                            for (const actionKey in thenActions) {
                                                if (thenActions.hasOwnProperty(actionKey)) {
                                                    const thenAction = thenActions[actionKey];
                                                    const thenActionId = actions.find(a => a.qurytype === thenAction.actionRule);
                                                    if (thenActionId) {
                                                        const obj = {
                                                            modalData: message[0]
                                                        }
                                                        await this.executeDeleteQueries(obj, appId, request, thenActionId, user);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (rule.AND) {
                            const orActions = rule.AND;
                            for (const actionOr of orActions) {
                                const { actionRule, key, compare, value } = actionOr.if;
                                if (actionRule.includes('post_')) {
                                    const comparisonFunction = this.getComparisonFunction(compare);
                                    if (comparisonFunction(this.getKeyAssignValue(context, key), value)) {
                                        const thenActionId = actions.find(a => a.qurytype === actionRule);
                                        if (thenActionId) {
                                            const obj = {
                                                modalData: message[0]
                                            }
                                            await this.executeDeleteQueries(obj, appId, request, thenActionId, user);
                                        }
                                        if (actionOr.then) {
                                            const thenActions = actionOr.then;
                                            for (const actionKey in thenActions) {
                                                if (thenActions.hasOwnProperty(actionKey)) {
                                                    const thenAction = thenActions[actionKey];
                                                    const thenActionId = actions.find(a => a.qurytype === thenAction.actionRule);
                                                    if (thenActionId) {
                                                        const obj = {
                                                            modalData: message[0]
                                                        }
                                                        await this.executeDeleteQueries(obj, appId, request, thenActionId, user);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                else if (actionRule.includes('get_')) {
                    if (appId == "651fa8129ce5925c4c89ced7") {
                        key = key.replace('$zonekey', `${parentId}`);
                    }

                    const comparisonFunction = this.getComparisonFunction(compare);
                    if (comparisonFunction(value, key)) {

                        const getActionId = actions.find(a => a.qurytype === actionRule);
                        const data = await this.getDb(getActionId?.id, user, request, parentId, page, pageSize, getActionId, search, filters);
                        message = data;
                        if (rule.then) {
                            const thenActions = rule.then;
                            for (const actionKey in thenActions) {
                                if (thenActions.hasOwnProperty(actionKey)) {
                                    const thenAction = thenActions[actionKey];
                                    const thenActionId = actions.find(a => a.qurytype === thenAction.actionRule);
                                    if (thenActionId) {
                                        message = await this.executeDeleteQueries(context, appId, request, thenActionId, user);
                                    }
                                }
                            }
                        }
                    }
                }
                else if (actionRule.includes('delete_')) {
                    const comparisonFunction = this.getComparisonFunction(compare);
                    if (comparisonFunction(value, key)) {
                        if (!externalLogin || externalLogin == undefined) {
                            let getCurrentPolicy = await this.getMappingByPolicyIdAppId(policyId, appId, screenId);
                            if (!getCurrentPolicy.data) {
                                return new ApiResponse(false, "You did not have delete authority assign of this screen", []);
                            }
                            const checkCreateAssign = getCurrentPolicy?.data?.find(a => a.delete == true);
                            if (!checkCreateAssign) {
                                return new ApiResponse(false, "You did not have delete authority assign of this screen", []);
                            }
                        }

                        const getActionId = actions.find(a => a.qurytype === actionRule);
                        const data = await this.executeDeleteQueries(context, appId, request, getActionId, user);
                        message = data;
                    }
                }
                else if (actionRule.includes('put_')) {
                    const comparisonFunction = this.getComparisonFunction(compare);
                    if (comparisonFunction(value, key)) {
                        if (!externalLogin || externalLogin == undefined) {
                            let getCurrentPolicy = await this.getMappingByPolicyIdAppId(policyId, appId, screenId);
                            if (!getCurrentPolicy.data) {
                                return new ApiResponse(false, "You did not have delete authority assign of this screen", []);
                            }
                            const checkCreateAssign = getCurrentPolicy?.data?.find(a => a.delete == true);
                            if (!checkCreateAssign) {
                                return new ApiResponse(false, "You did not have delete authority assign of this screen", []);
                            }
                        }

                        const getActionId = actions.find(a => a.qurytype === actionRule);
                        // console.log('context : ' + context)
                        const data = await this.executeDeleteQueries(context, appId, request, getActionId, user);
                        message = data;
                        if (rule.then) {
                            const thenActions = rule.then;
                            for (const actionKey in thenActions) {
                                if (thenActions.hasOwnProperty(actionKey)) {
                                    const thenAction = thenActions[actionKey];
                                    const thenActionId = actions.find(a => a.qurytype === thenAction.actionRule);
                                    if (thenActionId) {
                                        message = await this.executeDeleteQueries(context, appId, request, thenActionId, user);
                                    }
                                }
                            }
                        }
                    }
                }
                else if (actionRule.includes('fileupload_')) {
                    const comparisonFunction = this.getComparisonFunction(compare);
                    if (comparisonFunction(value, key)) {
                        const getActionId = actions.find(a => a.qurytype === actionRule);
                        // console.log('context : ' + context)
                        if (!externalLogin || externalLogin == undefined) {
                            let getCurrentPolicy = await this.getMappingByPolicyIdAppId(policyId, appId, screenId);
                            if (!getCurrentPolicy.data) {
                                return new ApiResponse(false, "You did not have delete authority assign of this screen", []);
                            }
                            const checkCreateAssign = getCurrentPolicy?.data?.find(a => a.delete == true);
                            if (!checkCreateAssign) {
                                return new ApiResponse(false, "You did not have delete authority assign of this screen", []);
                            }
                        }
                        const data = await this.executeDeleteQueries(context, appId, request, getActionId, user);
                    }
                }
            }
            const end = new Date().getTime();
            const executionTime = end - start;
            console.log(`Execution Time: ${executionTime}`);
        }
        return message;
    }
    async saveDb(data: any, screenBuildId: string, appId: string, orgId: string, request: any, user: string, action?: any) {
        let response = [];
        let { modalData, screenId, ruleId } = data;
        let isTableExist = false;
        let result: any;
        if (action) result = action;
        else result = await this.getActionById(ruleId, 'post', appId);

        for (const getRes of result) {
            console.log('data.objData ', getRes)
            if (getRes.type == "api") {
                const newPayload = {};
                let model: any;
                if (Object.keys(data.modalData).some(key => key.includes("."))) {
                    Object.keys(data.modalData).map(key => {
                        const newKey = key.split(".").pop();
                        newPayload[newKey] = data.modalData[key];
                    });
                    data.modalData = newPayload;
                }
                const objData = {
                    "payload": data,
                    "apiName": getRes.httpaddress,
                    "contentType": "application/json"
                }
                console.log('data.objData ', objData)
                response = await this.executeApi(objData, request);
            }
            else {
                const processedData = await this.processDynamicObject(modalData, orgId, appId, user, screenId);

                const queries = getRes.quries.split(";");
                const queryData = [];
                const tableNameWithId: { [key: string]: any } = {}; // Initialize with an empty object
                // let tableName1: any;
                for (const getQuery of queries) {
                    if (getQuery) {
                        const matches = getQuery.match(/insert\s+into\s+(\w+)/i);
                        const tableName = matches && matches.length > 1 ? matches[1] : null;

                        if (getQuery.trim() && tableName) {
                            queryData.push({
                                query: getQuery.trim(),
                                returningPlaceholder: `$${tableName}.${tableName}id`,
                            });

                            if (tableName) {
                                isTableExist = true;
                                tableNameWithId[tableName + 'id'] = [`${tableName}id`];
                            }
                        }
                    }
                }
                if (isTableExist) {
                    try {
                        let innerResult: any = [];
                        for (let i = 0; i < queryData.length; i++) {
                            const queryObj = queryData[i];
                            let query = queryObj.query;
                            const matches = query.match(/insert\s+into\s+(\w+)/i);
                            const tableName = matches && matches.length > 1 ? matches[1] : null;
                            const matchingColumn = Object.keys(tableNameWithId).find(column => query.includes(column));

                            let queryValues: any = {};

                            // this one use for schema 
                            const schemaName = 'admin';
                            query = query.toLowerCase().replace('output inserted.*', ' ');
                            query = query.toLowerCase().replace(/insert into (\w+)/, `insert into ${schemaName}.${tableName}`);
                            query = query.replace('ddmmyy', 'DDMMYY');


                            const id = uuidv4();


                            const populateQueryValues = (obj, prefix = '') => {
                                for (const key in obj) {
                                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                                        populateQueryValues(obj[key], prefix + key + '.');
                                    } else if (key == 'id') {
                                        queryValues['$' + prefix + key] = id;
                                    } else if (key == 'createdon') {
                                        queryValues['$' + prefix + key] = new Date().toISOString();
                                    } else {
                                        queryValues['$' + prefix + key] = obj[key];
                                    }
                                }
                            };
                            const containsArray = Object.values(modalData).some((value) => Array.isArray(value));
                            if ((containsArray && i != queryData.length - 1) || !containsArray) {
                                console.log('containsArray')
                                populateQueryValues(modalData);
                                queryValues[`$${tableName}.id`] = id;
                                queryValues[`$${tableName}.createdon`] = new Date().toISOString();
                                modalData[`${tableName}.createdon`] = new Date().toISOString();
                                for (const [key, value] of Object.entries(queryValues)) {
                                    if (value !== null) {
                                        if (matchingColumn && i != 0) {
                                            if ('$' + tableName + '.' + matchingColumn == key) {
                                                query = query.replace(key, (tableNameWithId[matchingColumn] ? tableNameWithId[matchingColumn] : `'${value}'`));
                                            }
                                            else query = query.replace(key, `'${value}'`);
                                        }

                                        else {
                                            console.log('2')
                                            query = query.replace(key, `'${value}'`);
                                        }
                                    }
                                }
                            }
                            else {
                                console.log('containsArray1')
                                queryValues[`$${tableName}.id`] = id;
                                queryValues[`$${tableName}.createdon`] = new Date().toISOString();
                                modalData[`${tableName}.createdon`] = new Date().toISOString();
                                populateQueryValues(modalData);
                                queryValues = this.transformDynamicNestedData(queryValues, modalData);

                                const containsArray: any = Object.values(modalData).find((value) => Array.isArray(value));

                                // Extract column names
                                const columnNamesMatch = query.match(/\(([^)]+)\)/);
                                const columnNames = columnNamesMatch ? columnNamesMatch[1].split(', ').map(column => column.trim()) : [];
                                // Generate the base query
                                let baseQuery = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES `;

                                // Iterate through queryValues and build the query
                                for (let index = 0; index < queryValues.length; index++) {
                                    const element = queryValues[index];
                                    let values = [];

                                    for (let [key, value] of Object.entries(element)) {
                                        if (value !== null && columnNames.includes(key.split('.')[1])) {
                                            console.log(`$${tableName}.${matchingColumn}` == key);
                                            console.log('`$${tableName}.${matchingColumn}` : ' + `$${tableName}.${matchingColumn}`)
                                            console.log('key : ' + key)
                                            if (`$${tableName}.${matchingColumn}` == key) {
                                                console.log('tableNameWithId[matchingColumn] : ' + JSON.stringify(tableNameWithId))
                                                values.push(tableNameWithId[matchingColumn]);
                                            }
                                            else {
                                                values.push(`'${containsArray[index][key.split('.')[1] || key]}'`);
                                            }
                                        }
                                    }

                                    baseQuery += `(${values.join(', ')})`;
                                    if (index < queryValues.length - 1) {
                                        baseQuery += ', ';
                                    }
                                }
                                query = baseQuery;
                            }

                            console.log('query : ' + query);

                            let queryExec = await this.crateDbService.executeQuery(query);
                            if (queryExec.isSuccess == false) {
                                return queryExec;
                            }
                            innerResult = queryExec?.data;
                            console.log("Table Name " + tableName)
                            tableNameWithId[tableName + 'id'] = innerResult[0]?.id;

                            if (tableName == 'spectrumissue') {
                                console.log("Table Name " + tableName);
                                innerResult[0].issueid = innerResult[0]?.id;
                            }

                            if (queryData.length - 1 !== i && queryObj.returningPlaceholder && innerResult.length > 0 && innerResult[0]?.id) {
                                const returningPlaceholder = queryObj.returningPlaceholder;
                                const value = innerResult[0]?.id;
                                queryValues[returningPlaceholder] = value;
                                const modalDataKey = returningPlaceholder.replace('$', '');
                                modalData[modalDataKey] = value;
                            }
                            modalData[queryObj.returningPlaceholder.replace('$', '')] = innerResult[0]?.id;
                            response.push({ tableName: queryObj.returningPlaceholder, id: innerResult[0]?.id });
                        }
                        response = [modalData];
                        return response;
                    } catch (error) {
                        response = [{ error: "Failed to execute queries" }]
                    }
                } else {
                    response = [{ error: "this table not exist please contact admin" }]
                }
            }
        }
        return response;
    }
    async executeDeleteQueries(data: any, appId: string, request: any, action?: string, user?: any): Promise<ApiResponse<any>> {
        // console.log("update11 : " + JSON.stringify(data));
        let innerResult = [];
        const dataUrlRegex = /^data:image\/(png|jpg|jpeg);base64,/i;

        for (let key in data.modalData) {
            if (data.modalData[key] && dataUrlRegex.test(data.modalData[key])) {
                const base64Data = data.modalData[key].replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');

                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                const imagePath = `./uploads/image-${uniqueSuffix}.jpg`;
                fs.writeFileSync(imagePath, imageBuffer); // Save the image file to the './uploads' directory
                const path = `/uploads/image-${uniqueSuffix}.jpg`;

                data.modalData[key] = path; // Update the 'image' property in the 'body' object with the file path
            }
        }

        const { modalData, postType, screenId } = data;
        const result: any = action;
        // const result: any = await this.actionService.findById(actionId);

        let isTableExist = false;
        try {
            if (result.type == "api") {
                const newPayload = {};
                let model: any;
                if (Object.keys(data.modalData).some(key => key.includes("."))) {
                    Object.keys(data.modalData).map(key => {
                        const newKey = key.split(".").pop();
                        newPayload[newKey] = data.modalData[key];
                    });
                    data.modalData = newPayload;
                }
                // console.log('getRes.httpAddress ' + result.httpAddress)
                // console.log('data.modalData ', data)
                const objData = {
                    "payload": data,
                    "apiName": result.httpAddress,
                    "contentType": "application/json"
                }
                // console.log('data.objData ', objData)
                innerResult = await this.executeApi(objData, request);
            }
            else {
                if (result.quries) {
                    // console.log("my querry: ", JSON.stringify(modalData))
                    const queries = result.quries.split(";");
                    let isTableExist = false; // Initialize to false

                    for (const getQuery of queries) {
                        isTableExist = false;
                        if (getQuery) {
                            const updateRegex = /UPDATE\s+(\w+)\s+SET\s+/i;
                            const deleteRegex = /DELETE\s+FROM\s+(\w+)\s+/i;
                            const updateMatches = updateRegex.exec(getQuery);
                            const deleteMatches = deleteRegex.exec(getQuery);
                            let tableName = '';
                            if (updateMatches && updateMatches.length > 1) {
                                tableName = updateMatches[1].toLowerCase();
                                // if (await this.knex.schema.hasTable(tableName)) {
                                //   isTableExist = true;
                                // }
                            } else if (deleteMatches && deleteMatches.length > 1) {
                                tableName = deleteMatches[1].toLowerCase();

                                // if (await this.knex.schema.hasTable(tableName)) {
                                //   isTableExist = true;
                                // }
                            }
                            // console.log("substitutedQuery : " + JSON.stringify(tableName));
                            if (isTableExist) {
                                try {

                                    let query = getQuery.trim()
                                    const queryValues = {};
                                    const populateQueryValues = (obj, prefix = '') => {
                                        for (const key in obj) {
                                            if (typeof obj[key] === 'object' && obj[key] !== null) {
                                                populateQueryValues(obj[key], key);
                                            }
                                            else {
                                                if (key.includes('.')) {
                                                    if (key.split('.')[0] == tableName) {
                                                        queryValues['$' + key.split('.')[1]] = obj[key];
                                                    }
                                                }
                                            }
                                        }
                                    };
                                    // console.log("modalData : " + JSON.stringify(modalData))
                                    populateQueryValues(modalData);
                                    // console.log("queryValues : " + JSON.stringify(queryValues));
                                    for (const [key, value] of Object.entries(queryValues)) {
                                        if (value !== null) {
                                            query = query.replace(key, `${value}`);
                                        }
                                    }
                                    let substitutedQuery = query.replace(/\$(\w+)/g, (_, key) => {
                                        return modalData[key];
                                    });
                                    substitutedQuery = substitutedQuery.replace('$createdby', user);

                                    if (updateMatches && updateMatches.length > 1) {
                                        substitutedQuery = substitutedQuery.toLowerCase().replace(/update (\w+)/, `update admin.${tableName}`);
                                    } else if (deleteMatches && deleteMatches.length > 1) {
                                        substitutedQuery = substitutedQuery.toLowerCase().replace(/delete from (\w+)/, `delete from admin.${tableName}`);
                                    }
                                    console.log('modalData : ' + JSON.stringify(modalData))
                                    console.log('tableName : ' + tableName);
                                    if ((tableName == 'orderrequest' || tableName == 'customeclearence' || tableName == 'pmrrequest') && (modalData[tableName + ".tdrapproval"] == 'Approved' || modalData[tableName + '.status'] == 'Approved')) {
                                        try {
                                            console.log('tableName : ' + tableName);
                                            console.log('modalData[tableName + ".requiredfrequency"] : ' + modalData[tableName + ".requiredfrequency"]);
                                            if (tableName == 'orderrequest' && modalData[tableName + ".requiredfrequency"]) {
                                                console.log('tableName 44323224 : ' + tableName);
                                                // let trimvalue = modalData[tableName + ".requiredfrequency"] ? modalData[tableName + ".requiredfrequency"].trim() : '';
                                                // console.log('trimvalue : ' + trimvalue)
                                                // let getDataQuery = `select COUNT(*) as total from orderrequest where requiredfrequency =  ${"'" + trimvalue + "'" || "''"} AND id != ${modalData[tableName + ".id"] || 0} `;

                                                console.log('trimvalue : ' + modalData[tableName + ".requiredfrequency"] + modalData[tableName + ".requiredfrequency"].trim())
                                                let trimvalue = modalData[tableName + ".requiredfrequency"] ? modalData[tableName + ".requiredfrequency"].replace(/\s/g, '') : '';
                                                // let getDataQuery = `SELECT COUNT(*) as total FROM orderrequest WHERE requiredfrequency LIKE '%${trimvalue || ""}%' AND id != ${modalData[tableName + ".id"] || 0} `;
                                                let getDataQuery = `SELECT STUFF(( SELECT ',' + CONVERT(NVARCHAR(max), requiredfrequency) FROM orderrequest where id <> ${modalData[tableName + ".id"] || 0} GROUP BY requiredfrequency FOR XML PATH('')), 1, 2, '') AS requiredfrequencystring`;
                                                console.log('getDataQuery : ' + getDataQuery)

                                                const getuserDetail = await this.crateDbService.executeQuery(getDataQuery);
                                                let responseData = getuserDetail?.data
                                                // let responseData: any = await trx.raw(getDataQuery);
                                                console.log('responseData : ' + JSON.stringify(responseData[0].requiredfrequencystring))

                                                let newData = responseData?.[0]?.requiredfrequencystring.split(',');
                                                let userData = trimvalue.split(',');
                                                console.log('userData : ' + userData)
                                                let commonElements = userData.filter(value => newData.includes(value.replace(' ', '')));
                                                console.log('newData : ' + newData)
                                                console.log('commonElements : ' + JSON.stringify(commonElements))
                                                let outputMessage;
                                                if (commonElements.length > 0) {
                                                    outputMessage = true;
                                                } else {
                                                    outputMessage = false;
                                                }

                                                console.log('outputMessage : ' + outputMessage);
                                                if (!outputMessage) {
                                                    const getuserDetail = await this.crateDbService.executeQuery(substitutedQuery);
                                                    innerResult = getuserDetail.data;
                                                } else {
                                                    return new ApiResponse(false, `This frequency already assigned ${commonElements.join(',')}`);
                                                }
                                            } else {
                                                const getuserDetail = await this.crateDbService.executeQuery(substitutedQuery);
                                                innerResult = getuserDetail.data;
                                            }
                                            // Check if tableName is in the given array and innerResult has at least one element with tdrapproval as 'Approved'
                                            console.log('innerResult : ' + JSON.stringify(innerResult[0]))
                                            const approvedTables = ['orderrequest', 'customeclearence', 'pmrrequest'];
                                            const isApproved = approvedTables.includes(tableName) && innerResult.length > 0 && innerResult[0]?.tdrapproval === 'Approved';

                                            if (isApproved) {
                                                let Attachment: any = '';
                                                let templateName: string = '';
                                                switch (tableName) {
                                                    case 'orderrequest':
                                                        templateName = innerResult[0]?.servicetype;
                                                        break;
                                                    case 'pmrrequest':
                                                        templateName = 'pmrrequest';
                                                        break;
                                                    default:
                                                        Attachment = '';
                                                }
                                                let date: any = '';
                                                // if (templateName) {
                                                //     const templateData = await this.emailTemplatesService.getEmailTemplateByName(templateName, innerResult[0]);
                                                //     // console.log('templateData : ' + JSON.stringify(templateData))
                                                //     Attachment = templateData?.data ? [templateData?.data[0]?.updatedHtml] : '';
                                                //     date = templateData?.data ? templateData?.data[0]?.date : '';
                                                // }
                                                // else {
                                                //   Attachment = this.emailService.makeHtml(innerResult[0], tableName);
                                                // }
                                                let path: any = '';
                                                // console.log('Attachment : ' + Attachment)
                                                const email = innerResult[0].createdby;
                                                // const email = 'hasnainatique786@gmail.com';
                                                // if (tableName == 'customeclearence') {
                                                //     await this.emailService.sendEmail('Custome Clearence Approval', email, 'Custome Clearence Approval', '<p>Your Costome Clearence Request is Approved</p>'
                                                //     );
                                                // } else {
                                                //     let emailText = tableName == 'orderrequest' ? '<p>Your Frequency Request is Approved</p>' : '<p>Your PMR Request is Approved</p>'
                                                //     path = Attachment ? await this.emailService.sendHtmlAsPdf(tableName == 'orderrequest' ? 'Frequency Approval' : 'PMR Approval', email, Attachment, date ? date : null, emailText) : '';
                                                // }
                                                console.log('path : ' + path);
                                                if (path) {
                                                    const orderrequestQuery = `UPDATE ${tableName} SET pdffilepath = '${path}' WHERE id = ${innerResult[0].id};`;
                                                    console.log('orderrequestQuery : ' + orderrequestQuery);
                                                    const getuserDetail = await this.crateDbService.executeQuery(orderrequestQuery);
                                                    innerResult = getuserDetail.data;

                                                    // await trx.raw(orderrequestQuery);
                                                }
                                            }

                                        } catch (error) {
                                            console.error("An error occurred:", error);
                                        }
                                    }
                                    else if (tableName == 'wifirequest') {
                                        try {
                                            const getuserDetail = await this.crateDbService.executeQuery(substitutedQuery);
                                            innerResult = getuserDetail.data;
                                            // innerResult = await trx.raw(substitutedQuery);
                                            if (innerResult.length > 0 && innerResult[0]?.status == 'Approved') {
                                                let date = '';
                                                // const templateData = await this.emailTemplatesService.getEmailTemplateByName('wifirequest', innerResult[0]);
                                                // let Attachment = templateData?.data ? [templateData?.data[0]?.updatedHtml] : '';
                                                // date = templateData?.data ? templateData?.data[0]?.date : '';
                                                // let path = Attachment ? await this.emailService.sendHtmlAsPdf('Wifi Approval', innerResult[0].createdby, Attachment, date ? date : null, `<p>Your Wifi Request is Approved</p>`) : '';

                                                // if (path) {
                                                //     let orderrequestQuery = `UPDATE ${tableName} SET pdffilepath = '${path}' WHERE id = ${innerResult[0].id};`;
                                                //     await trx.raw(orderrequestQuery);
                                                // }
                                            }
                                        } catch (error) {
                                            console.error("An error occurred in wifirequest:", error);
                                            // Additional actions can be performed to handle or report the error
                                        }
                                    }
                                    else if (tableName == 'spectrumissue') {
                                        const getuserDetail = await this.crateDbService.executeQuery(substitutedQuery);
                                        innerResult = getuserDetail.data;
                                        // innerResult = await trx.raw(substitutedQuery);
                                        console.log('innerResult : ' + innerResult[0]);
                                        // if (innerResult.length > 0) {
                                        //     const makeHtmlTemplate = this.emailService.makeTickerInfo(innerResult[0]);
                                        //     // await this.emailService.sendEmail(innerResult[0]?.subject ? innerResult[0]?.subject : 'Ticket Information', innerResult[0]?.supportgroup, 'Ticket Information', makeHtmlTemplate);
                                        //     await this.emailService.sendEmail(innerResult[0]?.subject ? innerResult[0]?.subject : 'Ticket Information', innerResult[0]?.manager, 'Ticket Information', makeHtmlTemplate);
                                        // }
                                    }
                                    else {
                                        const getuserDetail = await this.crateDbService.executeQuery(substitutedQuery);
                                        innerResult = getuserDetail.data;
                                        console.log('substitutedQuery : ' + substitutedQuery)
                                        // innerResult = await trx.raw(substitutedQuery);
                                    }

                                }
                                catch (error) {
                                    // await trx.rollback();
                                }
                            }
                        }
                    }

                }
            }
            // await trx.commit();
            return new ApiResponse(true, 'Record Updated', innerResult);
        }
        catch (error) {
            // await trx.rollback();
            return new ApiResponse(false, `Failed to execute queries: ${error}`, []);
        }
    }
    async getDb(id: string, user: any, request: any, parentId?: any, page?: any, pageSize?: any, action?: any, search?: string, filters?: string) {
        let isTableExist = true;
        // let isTableExist = false;
        let response = [];
        let result: any;
        console.log("Get : " + JSON.stringify(new Date()));
        if (action) result = action;
        else result = await this.getActionById(id);
        if (result.type == "api") {
            console.log('result.type :' + result.type)
            try {
                if (parentId)
                    result.httpAddress = result.httpAddress + '/' + parentId;
                let url = result.httpAddress.includes(SPECTRUM_CONFIG.SPECTRUM.serverPath) ? result.httpAddress : SPECTRUM_CONFIG.SPECTRUM.serverPath + result.httpAddress;
                let apiData = await this.executeGetApi(url, request);
                console.log('apiData : ' + JSON.stringify(apiData))
                return apiData;
            } catch (error) {
                return error; // Return the error to the frontend
            }
        }
        else {
            let query = result.quries.toString();
            let queryData: any = {};
            const matches = result.quries.match(/from\s+(\w+)/i);
            const tableName = matches && matches.length > 1 ? matches[1] : null;
            if (result.quries.trim() && tableName) {
                queryData = {
                    query: result.quries.trim(),
                    returningPlaceholder: `$${tableName}.${tableName}_id`,
                };

                // if (await this.knex.schema.hasTable(tableName)) {
                //     isTableExist = true;
                // }
            }

            if (isTableExist) {
                const queryValues = {};

                // const trx = await this.knex.transaction();

                try {
                    if (parentId) {
                        const finalQuery = `${query}'${parentId}'`;
                        query = JSON.parse(JSON.stringify(finalQuery));
                    }
                    query = query.replace(/\$createdby/g, "'" + user + "'");

                    let countQuery: any = `select COUNT(*) as total from ( ${query.replace(/ORDER BY.*?(;|$)/i, '/*$&*/')} ) AS total`;
                    countQuery = countQuery.replace(";", '');
                    console.log("get query : " + query);
                    console.log("countQuery : " + countQuery);


                    if (page && pageSize) {
                        const offset = (page - 1) * pageSize;
                        query = query.replace(';', '');

                        // Extract column names from the SELECT clause
                        const selectColumns = query.match(/SELECT\s+([^;]+)/i)[1];
                        const firstColumn = selectColumns.split(',')[0].trim(); // Get the first column


                        if (query.toLowerCase().includes('order by')) {
                            query += ` OFFSET ${offset} LIMIT ${pageSize}`;
                        }
                        else {
                            query += ` ORDER BY id OFFSET ${offset} LIMIT ${pageSize}`;
                        }
                        query = query.replaceAll('@search', search ? "'" + search + "'" : "''");
                        countQuery = countQuery.replaceAll('@search', search ? "'" + search + "'" : "''");
                        if (query.includes('@filters')) {
                            const filtersClause = filters ? ` AND ${filters}` : '';

                            if (query.toLowerCase().includes('where')) {
                                query = query.replace(/@filters/g, filters ? filtersClause : '');
                                countQuery = countQuery.replace(/@filters/g, filters ? filtersClause : '');
                            } else {
                                query = query.replace(/@filters/g, filters ? ` WHERE ${filters}` : '');
                                countQuery = countQuery.replace(/@filters/g, filters ? ` WHERE ${filters}` : '');
                            }
                        }
                        // countQuery += ` ORDER BY ${firstColumn} DESC OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
                        console.log("query Pagination :" + countQuery)
                        let queryExec = await this.crateDbService.executeQuery(query);
                        const response = queryExec?.data;

                        let countQueryExec = await this.crateDbService.executeQuery(countQuery);
                        const countResponse = countQueryExec?.data;
                        console.log("countResponse :" + countResponse)
                        const total = countResponse[0].total;
                        // return { data: response, count: total };
                        return new ApiResponse(true, "Get Data", response, total);
                    }

                    else {
                        console.log('get query : ' + query);
                        let queryExec = await this.crateDbService.executeQuery(query);
                        const response = queryExec?.data;

                        let countQueryExec = await this.crateDbService.executeQuery(countQuery);
                        const countResponse = countQueryExec?.data;

                        const total = countResponse[0]?.total || 0;

                        // return { data: response, count: total };
                        return new ApiResponse(true, "Get Data", response, total);
                    }
                }
                catch (error) {
                    // await trx.rollback();
                    response = [{ error: "Failed to execute queries" }];
                    return error; // Return the error to the frontend
                }
            }
            else {
                response = [{ error: "this table not exist please contact admin" }];
                return response; // Return the error to the frontend
            }
        }
    }
    async executeGetApi(apiName: any, @Req() request: any) {
        try {
            const config: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/json',
                    ...request.headers
                },
                // Add other Axios configuration options as needed
            };
            console.log('apiName111 : ' + apiName)
            const response = await axios.get(apiName, config);
            console.log('response11 : ' + response)
            // Return the response data
            return response.data;
        }
        catch (error) {
            console.log('error : ' + error)
            // Handle errors and return appropriate response
            if (error.response) {
                throw error.response.data; // Throw the error response data
            } else {
                throw error; // Throw the original error if no response is available
            }
        }
    }
    getComparisonFunction(operator: string): (left: any, right: any) => boolean {
        switch (operator) {
            case '==':
                return (left, right) => left == right;
            case '>':
                return (left, right) => {
                    return left > right;
                };
            case '!=':
                return (left, right) => left != right;
            case '>=':
                return (left, right) => {
                    return left >= right;
                };
            case '<=':
                return (left, right) => {
                    return left <= right;
                };
            case '<':
                return (left, right) => {
                    return left < right;
                };
            default:
                throw new Error(`Unknown comparison operator: ${operator}`);
        }
    }
    decodeBase64ToAudio(base64Data: string): Buffer {
        return Buffer.from(base64Data.split(',')[1], 'base64');
    }
    getKeyAssignValue(context: any, key: any) {
        let getValue;

        // Assuming currentValue is an object with a modalData property
        const modalData = context?.modalData;

        if (modalData) {
            for (const keys in modalData) {
                if (modalData.hasOwnProperty(keys)) {
                    if (keys === key) {
                        getValue = modalData[keys];
                        break;
                    }
                }
            }
        }
        return getValue;
    }
    removeHeaders(headers: Record<string, string>, headersToOmit: string[]): Record<string, string> {
        return Object.keys(headers)
            .filter(header => !headersToOmit.includes(header))
            .reduce((result, key) => {
                result[key] = headers[key];
                return result;
            }, {} as Record<string, string>);
    }
    async executeApi(data: any, @Req() request: any) {
        try {
            const headersToOmit = ['content-type', 'accept', 'connection', 'sec-ch-ua', 'user-agent', 'accept-encoding', 'accept-language'
                , 'sec-ch-ua-mobile', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest', 'referer', 'content-length', 'sec-ch-ua-platform'];
            const remainingHeaders = this.removeHeaders(request.headers, headersToOmit);
            // Validate the incoming data
            const { payload, apiName } = data;
            if (!payload || !apiName) {
                throw new BadRequestException('Payload and apiName are required.');
            }
            // console.dir(request.headers);
            // Set up the request configuration
            const config: AxiosRequestConfig = {
                headers: {
                    ...remainingHeaders,
                    'Content-Type': data.contentType,
                },
                // Add other Axios configuration options as needed
            };
            // console.log("apiName", apiName)
            // console.log("payload", payload)
            console.log("config", config)
            // console.log("data", data)
            // Make the API request
            let modalData = payload
            if (modalData?.modalData)
                modalData = modalData?.modalData
            const response = await axios.post(apiName, modalData, config);
            // console.log('response : ' + response)
            // Return the response data
            return response.data;
        } catch (error) {
            // Handle errors and return appropriate response
            if (error.response) {
                throw error.response.data; // Throw the error response data
            } else {
                throw error; // Throw the original error if no response is available
            }
        }
    }
    async getByRuleId(ruleId, appId) {
        let actionRuleQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.actionrule WHERE id = '${ruleId}'  AND applicationid = '${appId}'`;
        let actionRuleExec = await this.crateDbService.executeQuery(actionRuleQuery);
        return actionRuleExec?.data;
    }
    async getActionByScreenBuilderId(actionRule, appId) {
        let actionQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.actions WHERE screenbuilderid = '${actionRule[0]?.screenbuilderid}'  AND applicationid = '${appId}'`;
        let actionExec = await this.crateDbService.executeQuery(actionQuery);
        return actionExec?.data;
    }
    async getMappingByPolicyIdAppId(policyId, appId, screenId) {
        let query = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.policymapping WHERE policyid = '${policyId}'  AND applicationid = '${appId}'`;
        let res = await this.crateDbService.executeQuery(query);
        let resData = this.checkScreenIdExists(res.data?.[0]?.data?.json, screenId);
        let obj = {
            data: resData ? [resData] : null
        }
        return obj
    }
    async getActionById(id: string, type?: string, appId?: string) {
        let actionQuery;
        if (type)
            actionQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.actions WHERE id = '${id}' AND actionlink = '${type}'  AND applicationid = '${appId}'`;
        else
            actionQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.actions WHERE id = '${id}'`;

        let actionExec = await this.crateDbService.executeQuery(actionQuery);
        return actionExec?.data;
    }
    async getApplicationById(id: string) {
        let actionQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.application WHERE id = '${id}'`;
        let actionExec = await this.crateDbService.executeQuery(actionQuery);
        return actionExec?.data?.[0];
    }
    async getOrganizationById(id: string) {
        let actionQuery = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.organization WHERE id = '${id}' `;
        let actionExec = await this.crateDbService.executeQuery(actionQuery);
        return actionExec?.data?.[0];
    }
    async processDynamicObject(obj: any, orgId: any, appId: any, user: any, screenId: any) {
        const dataUrlRegex = /^data:image\/(png|jpg|jpeg);base64,/i;

        for (const key in obj) {
            if (Array.isArray(obj[key])) {
                // If the property is an array, loop through its elements
                for (let i = 0; i < obj[key].length; i++) {
                    obj[key][i] = await this.processDynamicObject(obj[key][i], orgId, appId, user, screenId);
                }
            }
            else if (obj[key] && typeof obj[key] === 'object') {
                // If the property is an object, recursively process it
                obj[key] = await this.processDynamicObject(obj[key], orgId, appId, user, screenId);
            }
            else if (key.includes('applicationid')) {
                // Process application ID
                const application = await this.getApplicationById(appId);
                if (application) {
                    obj[key] = application.name;
                }
            }
            else if (key.includes('organizationid')) {
                // Process application ID
                const organization = await this.getOrganizationById(orgId);
                if (organization) {
                    obj[key] = organization.name;
                }
            }
            else if (key.includes('createdby')) {
                obj[key] = user;
            }
            else if (key.includes('screenid')) {
                obj[key] = screenId;
            }
            else if (key.includes('currentdate')) {
                const currentDate = new Date();
                const day = String(currentDate.getDate()).padStart(2, '0');
                const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
                const year = currentDate.getFullYear();
                obj[key] = `${day}-${month}-${year}`; // Assigns the current date in dd-mm-yyyy format
            }

        }

        return obj;
    }
    transformDynamicNestedData(data: any, modalData: any): any {
        let requiredResult: any = {};
        let sqlData = [];
        for (const key in data) {
            const containsNumber = /\d/.test(key);
            if (containsNumber) {
                let newKey = key.split('.');
                let startKey = newKey[0];
                let endKey = newKey[newKey.length - 1];
                requiredResult[startKey + '.' + endKey] = data[key];
            }
        }
        const containsArray: any = Object.values(modalData).find((value) => Array.isArray(value));
        for (let index = 0; index < containsArray.length; index++) {
            sqlData.push(requiredResult)
        }
        return sqlData;
    }
    // saveAudioToFile(audioData: Buffer, filePath: string): void {
    //     fs.writeFileSync(filePath, audioData);
    // }
    async sendEmail11(req, data: any, appId: string, request: any, action?: any, user?: any, screenBuildId?: any, actionRule?: any) {
        try {
            console.log('action : ' + action)
            let { emailtype, emailName, email, value, emailto } = action;
            if (action.emailsendingtype === 'post' || !action.emailsendingtype) {
                action.emailto = JSON.parse(action.emailto);
                const result = action.emailto.map(email => data.modalData[email]);
                emailto = result.filter(email => email);
                let primaryId = null;
                if (action.emailto.length > 0) {
                    let tableName = action.emailto[0].split('.')[0];
                    primaryId = data.modalData[`${tableName}.${tableName}id`]
                }
                let date = Date.now();
                const cmd = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.emailtemplates WHERE id = '${action.emailtemplate}'`;
                const res: any = await this.crateDbService.executeQuery(cmd);
                const getTemplate: any = res ? res.data[0] : null;
                if (getTemplate) {
                    if (action.emailtype === 'simple') {
                        const updatedHtml = data.modalData
                            ? this.emailService.replacePlaceholders(getTemplate.emailtemplate, data.modalData, Date.now())
                            : getTemplate.emailtemplate;
                        if (action.emailbulkindividual === 'bulk') {
                            return getTemplate.templatetype === 'pdf'
                                ? updatedHtml ? await this.emailService.sendHtmlAsPdf(getTemplate.subject, action.emailfrom, updatedHtml, date, 'Text', null, emailto) : ''
                                : await this.emailService.sendEmail(getTemplate.subject, action.emailfrom, 'Ticket Information', updatedHtml, null, null, emailto);
                        }
                        else if (action.emailbulkindividual === 'individual') {
                            const cmd = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.actions WHERE screenbuilderid = '${action.screenbuilderid}' AND applicationid = '${appId}'`;
                            const res: any = await this.crateDbService.executeQuery(cmd);
                            let actions = res ? res.data : [];
                            let postEmail = actions.filter((act: any) => act.type == 'email' && act.actionlink == 'post' && act?.elementname == action?.elementname);
                            console.log('postEmail : ' + JSON.stringify(postEmail))
                            if (postEmail.length > 0) {
                                const results = await Promise.all(postEmail.map(async (elementData) => {
                                    const cmd = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.emailtemplates WHERE id = '${action.emailtemplate}'`;
                                    const res: any = await this.crateDbService.executeQuery(cmd);
                                    const elementDataGetTemplate: any = res ? res.data[0] : null;
                                    const elementDataUpdatedHtml = data.modalData
                                        ? this.emailService.replacePlaceholders(elementDataGetTemplate.emailtemplate, data.modalData, Date.now())
                                        : getTemplate.data.emailtemplate;
                                    if (elementDataGetTemplate) {
                                        elementData.emailto = JSON.parse(elementData.emailto)
                                        const result = elementData.emailto.map(email => data.modalData[email]);
                                        elementData.emailto = result.filter(email => email);;
                                        if (elementData.emailbulkindividual === 'bulk') {
                                            return elementDataGetTemplate.templatetype === 'pdf'
                                                ? updatedHtml ? await this.emailService.sendHtmlAsPdf(elementDataGetTemplate.subject, elementData.emailfrom, updatedHtml, date, 'Text', null, elementData.emailto) : ''
                                                : await this.emailService.sendEmail(elementDataGetTemplate.subject, elementData.emailfrom, 'Ticket Information', updatedHtml, null, null, elementData.emailto);
                                        } else {
                                            return await Promise.all(elementData.emailto.map(async (element) => {
                                                return elementDataGetTemplate.templatetype === 'pdf'
                                                    ? (updatedHtml ? await this.emailService.sendHtmlAsPdf(elementDataGetTemplate.subject, element, elementDataUpdatedHtml, date, 'Text') : '')
                                                    : await this.emailService.sendEmail(elementDataGetTemplate.subject, element, 'Ticket Information', elementDataUpdatedHtml);
                                            }));
                                        }
                                    }
                                    return ''; // Handle other cases if needed
                                }));

                                return results.join(''); // or return results; depending on your use case
                            }
                        }
                    }
                    else if (action.emailtype === 'token') {
                        const updatedHtml = data.modalData
                            ? this.emailService.replacePlaceholders(getTemplate.emailtemplate, data.modalData, Date.now())
                            : getTemplate.emailtemplate;
                        if (action.emailbulkindividual === 'bulk') {
                            // const token = this.tokenService.generateToken(emailto,emailto);
                            // return getTemplate.templatetype === 'pdf'
                            //     ? updatedHtml ? await this.emailService.sendHtmlAsPdf('Request', action.emailfrom, updatedHtml, date, 'Text', null, emailto) : ''
                            //     : await this.emailService.sendEmail('Subject', action.emailfrom, 'Ticket Information', updatedHtml, null, null, emailto);
                        }
                        else if (action.emailbulkindividual === 'individual') {
                            const cmd = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.actions WHERE screenbuilderid = '${action.screenbuilderid}' AND applicationid = '${appId}' AND type = 'email' AND elementname = '${action?.elementname}'`;
                            const res: any = await this.crateDbService.executeQuery(cmd);
                            let actions = res ? res.data : [];
                            let postEmail = actions.filter((act: any) => act.type == 'email' && act.actionlink == 'post' && act?.elementname == action?.elementname);
                            console.log('postEmail : ' + JSON.stringify(postEmail))
                            if (postEmail.length > 0) {
                                const results = await Promise.all(postEmail.map(async (elementData) => {

                                    const cmd = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.emailtemplates WHERE id = '${action.emailtemplate}'`;
                                    const res: any = await this.crateDbService.executeQuery(cmd);

                                    elementData.emailto = JSON.parse(elementData.emailto)
                                    const result = elementData.emailto.map(email => data.modalData[email]);
                                    elementData.emailto = result.filter(email => email);
                                    await Promise.all(elementData.emailto.map(async (emailUserName) => {
                                        const sanitizedUsername = emailUserName.replace(/\s/g, '');
                                        const getuserDetail: any = await this.crateDbService.executeQuery(`SELECT  * FROM ${DB_CONFIG.CRATEDB.mode}meta.users 
                                        WHERE LOWER((username)) = LOWER(('${sanitizedUsername}')) AND applicationId = '${appId}'`);
                                        const token = this.tokenService.generateToken((getuserDetail.data.length > 0 ? getuserDetail.data[0].username : emailUserName), appId, (getuserDetail.data.length == 0 ? true : false), `${elementData.pagelink}/${primaryId}`);
                                        const tokenModel = {
                                            url: elementData.pagetype == 'detailPage' ? `${req.headers.origin}/${elementData.pagelink}/${primaryId}?token=${token}` :
                                                `${req.headers.origin}/${elementData.pagelink}?token=${token}`,
                                            token: token,
                                            username: emailUserName,
                                            applicationid: appId,
                                            isvalid: true,
                                            page: elementData.pagetype == 'detailPage' ? `/${elementData.pagelink}/${primaryId}` : `/${elementData.pagelink}`
                                        }

                                        const { query, values } = this.queryGenratorService.generateInsertQuery(`${DB_CONFIG.CRATEDB.mode}meta.tokenmanager`, tokenModel);
                                        const tokenResult = await this.crateDbService.executeQuery(query);
                                        const elementDataGetTemplate: any = res ? res.data[0] : null;
                                        if (elementData.pagetype == 'detailPage') {
                                            data.modalData['token'] = `${req.headers.origin}/${elementData.pagelink}/${primaryId}?token=${token}`;
                                        } else {
                                            data.modalData['token'] = `${req.headers.origin}/${elementData.pagelink}?token=${token}`;
                                        }
                                        const elementDataUpdatedHtml = data.modalData
                                            ? this.emailService.replacePlaceholders(elementDataGetTemplate.emailtemplate, data.modalData, Date.now())
                                            : getTemplate.data.emailtemplate;
                                        if (elementDataGetTemplate) {
                                            if (elementData.emailbulkindividual === 'bulk') {
                                                elementDataGetTemplate.templatetype === 'pdf'
                                                    ? updatedHtml ? await this.emailService.sendHtmlAsPdf(elementDataGetTemplate.subject, elementData.emailfrom, updatedHtml, date, 'Text', null, emailUserName) : ''
                                                    : await this.emailService.sendEmail(elementDataGetTemplate.subject, elementData.emailfrom, 'Ticket Information', updatedHtml, null, null, emailUserName);
                                            } else {
                                                elementDataGetTemplate.templatetype === 'pdf'
                                                    ? (updatedHtml ? await this.emailService.sendHtmlAsPdf(elementDataGetTemplate.subject, emailUserName, elementDataUpdatedHtml, date, 'Text') : '')
                                                    : await this.emailService.sendEmail(elementDataGetTemplate.subject, emailUserName, 'Ticket Information', elementDataUpdatedHtml);
                                            }
                                        }
                                    }))

                                    return ''; // Handle other cases if needed
                                }));

                                return results.join(''); // or return results; depending on your use case
                            }
                        }
                    }
                } else {
                    return [];
                }
            }
            else {
                // if (email.includes('$')) {
                //   debugger
                //   const keysWithDollarSign: any = this.extractKeys(email);
                //   console.log(keysWithDollarSign)
                //   if (keysWithDollarSign.length > 0) {
                //     keysWithDollarSign.forEach(element => {

                //       email.replace(`$${element}`, data.modalData[element])
                //     });
                //   }
                // }
                const response = await this.crateDbService.executeQuery(email);
                if (response.length > 0) {
                    const resKey = Object.keys(response[0]);
                    let set1 = new Set(resKey);
                    let set2 = new Set(emailto.map(key => key.includes('.') ? key.split('.')[1] : key));
                    let keys = [...new Set([...set1].filter(value => set2.has(value)))];
                    console.log(keys)
                    const cmd = `SELECT * FROM ${DB_CONFIG.CRATEDB.mode}meta.emailtemplates WHERE id = ${action.screenBuildId}`;
                    const res: any = await this.crateDbService.executeQuery(cmd);
                    const getTemplate: any = res ? res.data[0] : null;
                    let groupedData = {};

                    keys.forEach(key => {
                        let filteredData = getTemplate.data.filter((item: any) => {
                            return item.emailto.some((email: any) => {
                                if (!email.includes('.')) {
                                    // If email includes a dot, check directly with the key
                                    return email === key;
                                } else {
                                    // If email does not include a dot, check if it ends with a dot followed by the key
                                    return email.endsWith(`.${key}`);
                                }
                            });
                        });

                        if (filteredData.length > 0) {
                            let emailTemplate = filteredData[0].emailTemplate;
                            let templatetype = filteredData[0].templatetype; // Assuming templatetype is present in filteredData

                            if (!groupedData[emailTemplate]) {
                                groupedData[emailTemplate] = { name: [], emailTemplate, templatetype };
                            }

                            groupedData[emailTemplate].name.push(key);
                        }
                    });

                    let requiredEndResult: any = Object.values(groupedData);

                    let bindData = response[0];
                    let updatedOutput = requiredEndResult.map((entry: any) => {
                        let updatedEntry = { ...entry }; // Create a shallow copy of the entry

                        if (entry.name) {
                            updatedEntry.name = entry.name.map((emailtype: any) => bindData[emailtype]);
                        }

                        return updatedEntry;
                    });

                    console.log('updatedOutput :' + JSON.stringify(updatedOutput));
                    if (updatedOutput.length > 0) {
                        // Use Promise.all to wait for all promises to complete
                        await Promise.all(updatedOutput.map(async (ele: any) => {
                            try {
                                let date = Date.now();
                                let updatedHtml = data.modalData ? this.emailService.replacePlaceholders(ele.emailTemplate, data.modalData, date) : ele.emailTemplate;

                                if (ele.
                                    templatetype === 'pdf') {
                                    return updatedHtml ? await this.emailService.sendHtmlAsPdf(ele.emailTemplate.subject, ele.name, updatedHtml, date ? date : null, 'Text') : '';
                                } else if (ele.
                                    templatetype === 'text') { // Fix the condition here
                                    return await this.emailService.sendEmail(ele.emailTemplate.subject, ele.name, 'Ticket Information', updatedHtml);
                                }
                            } catch (error) {
                                console.error('Error sending email:', error);
                                // You may want to handle errors or log them as needed
                                return '';
                            }
                        }));
                    }

                } else {
                    return [];
                }
            }

        } catch (error) {
            console.error('Error in sendEmail11:', error);
            // You can handle the error here or rethrow it if needed
            return error;
        }
    }
    replacePlaceholders(query, replacements) {
        for (const [key, value] of Object.entries(replacements)) {
            const placeholder = new RegExp(`\\$${key}`, 'g');
            query = query.replace(placeholder, value);
        }
        return query;
    }
    extractKeys(query) {
        const matches = query.match(/\$\w+/g);
        return matches ? matches.map(match => match.substring(1)) : [];
    }
    checkScreenIdExists(data, targetScreenId) {
        for (const item of data) {
            if (item?.screenId?.trim() === targetScreenId?.trim()) {
                return item;
            }
            if (item.children && item.children.length > 0) {
                if (this.checkScreenIdExists(item.children, targetScreenId)) {
                    return item;
                }
            }
        }
        return false;
    }

}
