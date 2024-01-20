import { Injectable } from '@nestjs/common';
import { CrateDbService } from 'src/common/common/crateDb.service';
const { v4: uuidv4 } = require('uuid');

@Injectable()
export class QueryGenratorService {
    /**
     *
     */
    constructor(private readonly crateDbService: CrateDbService) { }

    generateCreateQuery(tableName, schema) {
        // Construct the SQL query using template literal
        const query = `CREATE TABLE ${tableName} (${Object.entries(schema).map(([column, type]) => `${column.toLowerCase()} ${type == 'VARCHAR' ? 'STRING' : type}`).join(', ')});`;
        console.log(query);
        return { query };
    }

    async genrateGetExistingColumns(tableName, schema) {
        const getColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1;`;
        try {
            const existingColumnsResult = await this.crateDbService.executeQuery(getColumnsQuery, [tableName]);

            if (!existingColumnsResult.data) {
                throw new Error('Unable to retrieve existing columns');
            }

            const existingColumns = existingColumnsResult.data;
            return existingColumns;
        } catch (error) {
            console.error('Error retrieving existing columns:', error.message);
            throw error; // Rethrow the error to propagate it up
        }
    }

    async generateModifyTableQuery(tableName, schema) {
        const columnsToAdd = Object.entries(schema)
            .map(([column, type]) => `${column.toLowerCase()} ${type == 'VARCHAR' ? 'STRING' : type}`)
            .join(', ');

        const getColumnsQuery = `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = $1;`;

        try {
            const existingColumnsResult = await this.crateDbService.executeQuery(getColumnsQuery, [tableName]);

            if (!existingColumnsResult.data) {
                // Handle the case where rows is not defined
                throw new Error('Unable to retrieve existing columns');
            }

            const existingColumns = existingColumnsResult.data;

            const newColumns = Object.entries(schema)
                .filter(([column, type]) => !existingColumns.map(row => row.column_name.toLowerCase()).includes(column.toLowerCase()))
                .map(([column, type]) => `ADD COLUMN ${column.toLowerCase()} ${type == 'VARCHAR' ? 'STRING' : type}`)
                .join(', ');

            const columnsToDrop = existingColumns
                .filter(existingColumn => !Object.keys(schema).includes(existingColumn.column_name.toLowerCase()))
                .map(existingColumn => `DROP COLUMN IF EXISTS ${existingColumn.column_name.toLowerCase()}`)
                .join(', ');

            // Use ALTER TABLE to modify an existing table
            let addColumnQuery = null;
            let dropColumnQuery = null;
            if (newColumns) {
                addColumnQuery = `ALTER TABLE admin.${tableName} ${newColumns};`;
                console.log(addColumnQuery);
            }
            if (columnsToDrop) {
                dropColumnQuery = `ALTER TABLE admin.${tableName} ${columnsToDrop};`;
                console.log(dropColumnQuery);
            }
            return { addColumnQuery, dropColumnQuery };
        } catch (error) {
            console.error('Error retrieving existing columns:', error.message);
            throw error; // Rethrow the error to propagate it up
        }
    }

    generateDropTableQuery(tableName) {
        // Construct the SQL query using template literal //CASCADE
        const query = `DROP TABLE IF EXISTS admin.${tableName};`;
        console.log(query);
        return { query };
    }

    generateDropColumnQuery(tableName, columns) {
        // Construct the SQL query using template literal //CASCADE
        const query = `ALTER TABLE admin.${tableName} ${columns.map((column) => `DROP COLUMN IF EXISTS ${column.fieldname.toLowerCase()}`).join(', ')};`;
        console.log(query);
        return { query };
    }
    generateDeleteTblSchema(tableName, columns) {
        // Construct the SQL query using template literal //CASCADE
        const delQueery = `DELETE FROM ${tableName} WHERE id IN(${columns.map((column) => `'${column.id}'`).join(',')});`;
        console.log(delQueery);
        return { delQueery };
    }

    generateInsertQuery(tableName, dataObject) {

        const id = uuidv4();

        // Extract keys and values from the dataObject
        const keys = Object.keys(dataObject);
        const values = Object.values(dataObject);
        keys.unshift('id');
        keys.unshift('createddate');

        values.unshift(id);
        values.unshift(new Date().toISOString());
        // Create placeholders for parameterized query starting from $1
        const namedParameters = this.convertObjectToStringInsert(values);

        // const valuesString = values.map(value => `'${value}'`).join(', ');


        // Construct the SQL query using template literal
        const query = `INSERT INTO ${tableName} (${keys.join(', ')})  VALUES (${namedParameters}) RETURNING *`;
        console.log(query);

        return { query, values };
    }

    generateMultiInsertQuery(tableName, dataArray) {
        if (dataArray.length === 0) {
            throw new Error('Data array is empty');
        }

        let keys;
        let names = "";

        dataArray.forEach((element, index) => {
            const id = uuidv4();
            // Extract keys and values from the dataObject
            keys = Object.keys(element);
            const values = Object.values(element);
            keys.unshift('id');
            keys.unshift('createddate');
            values.unshift(id);
            values.unshift(new Date().toISOString());
            // Create placeholders for parameterized query starting from $1
            const namedParameters = this.convertObjectToStringInsert(values);
            names += index === 0 ? `(${namedParameters})` : `,(${namedParameters})`
        });

        // const valuesString = values.map(value => `'${value}'`).join(', ');


        // Construct the SQL query using template literal
        const query = `INSERT INTO ${tableName} (${keys.join(', ')})  VALUES ${names} RETURNING *`;
        console.log(query);

        return { query, values: [] };
    }
   
    generateInsertQueryExcludedColumns(tableName, dataObject, excludedColumns = []) {
        const id = uuidv4();


        // Extract keys and values from the dataObject
        const keys = Object.keys(dataObject);
        const allvalues = Object.values(dataObject);

        // Filter out excluded columns
        const filteredKeys = keys.filter(key => !excludedColumns.includes(key));
        const values = allvalues.filter((_, index) => !excludedColumns.includes(keys[index]));
        filteredKeys.unshift('id');

        // Include the generated UUID in the values
        values.unshift(id);

        // Construct the SQL query with actual values
        const valuesString = values.map(value => `'${value}'`).join(', ');

        // Construct the SQL query using template literal
        const query = `INSERT INTO ${tableName} (${filteredKeys.join(', ')})   VALUES (${valuesString}) RETURNING *`;

        return { query, values };
    }
    generateUpdateQuery(tableName, id, dataObject) {
        // Extract keys and values from the dataObject
        const keys = Object.keys(dataObject);
        const values = Object.values(dataObject);

        delete dataObject?.id;

        const namedParameters = this.convertObjectToString(dataObject);
        // Construct the SQL query using template literal
        const query = `UPDATE ${tableName} SET ${namedParameters} WHERE id = '${id}'  RETURNING *`;

        return { query, values };
    }
    generateDeleteQuery(tableName, id) {

        // Construct the SQL query using template literal
        const query = `DELETE FROM ${tableName} WHERE id = '${id}'`;

        return { query };
    }
    convertObjectToString(obj) {
        const keyValuePairs = Object.entries(obj).map(([key, value]) => {
            if (value === null || value === undefined) {
                // Handle null, undefined, or empty string
                return `${key} = null`;
            } else if (Array.isArray(value)) {
                // Handle arrays
                // let arrayAsString = JSON.stringify(value).replace(/'/g, "'");
                // arrayAsString = `ARRAY['${arrayAsString}']`;
                // arrayAsString = arrayAsString.replace("'[", "'");
                // return arrayAsString = arrayAsString.replace("]'", "'");
                const arrayAsString = JSON.stringify(value).replace(/"/g, "'");
                return `${key} = ${arrayAsString}`;
            } else if (typeof value === 'string') {
                return `${key} = '${value}'`;
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                return `${key} = ${value}`;
            } else {
                // Handle other data types as needed
                return `${key} = ${value}`;
            }
        });

        return keyValuePairs.join(', ');
    }
    convertObjectToStringInsert(obj) {
        const values = Object.values(obj).map(value => {
            if (value === '' || value === null || value === undefined) {
                // Handle null, undefined, or empty string
                return 'null';
            } else if (Array.isArray(value)) {
                // Handle arrays
                let arrayAsString = JSON.stringify(value).replace(/'/g, "'");
                arrayAsString = `ARRAY['${arrayAsString}']`;
                arrayAsString = arrayAsString.replace("'[", "'");
                return arrayAsString = arrayAsString.replace("]'", "'");
                // const arrayAsString = JSON.stringify(value).replace(/"/g, "'");
                // return `ARRAY[${arrayAsString}]`;
            } else if (typeof value === 'string') {
                return `'${value}'`;
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                return `${value}`;
            } else {
                // Handle other data types as needed
                return `${value}`;
            }
        });

        return values.join(', ');
    }
    convertObjectToStringInsertMultiple(obj) {
        const valuesString = Object.values(obj).map(item => {
            const formattedValues = Object.values(item).map(value => {
                if (value === null || value === undefined) {
                    // Handle null, undefined, or empty string
                    return 'null';
                } else if (Array.isArray(value)) {
                    // Handle arrays
                    let arrayAsString = JSON.stringify(value).replace(/'/g, "'");
                    arrayAsString = `ARRAY['${arrayAsString}']`;
                    arrayAsString = arrayAsString.replace("'[", "'");
                    return arrayAsString = arrayAsString.replace("]'", "'");
                    // const arrayAsString = JSON.stringify(value).replace(/"/g, "'");
                    // return `ARRAY[${arrayAsString}]`;
                } else if (typeof value === 'string') {
                    return `'${value}'`;
                } else if (typeof value === 'number' || typeof value === 'boolean') {
                    return `${value}`;
                } else {
                    // Handle other data types as needed
                    return `${value}`;
                }
            }).join(', ');

            return `(${formattedValues})`;
        }).join(', ');
        return valuesString

    }



}


// INSERT INTO dev_meta.users (username, email, firstName, lastName, companyName, password, accreditationNumber, organizationId, applicationId, status, domain, contactnumber, responsekey) VALUES ('name@gmail.com', 'name@gmail.com', 'Firstname', 'Lastname', 'Company name', '$argon2id$v=19$m=65536,t=3,p=4$yWONbKdVoLFRas+9670ZtA$IRJid3vhV0hdyLAUW47BuCAA2V/cXIehECkLSsuSPm0', '10', '64abfde576ac2e992aa14d75', '64e8766e9fe17461303c0a54', 'Pending', 'taskmanager.com', '00000', '03AFcWeA66CSxteao_AuN57xsdpTmd7oTeXV2uzo3UmXvnHkbpnKohV9SsraFU17ZJc5pPm6Z8D1NbVpHoHn6XKRgJHQTc3xo0twjjGrqz1cjnnn-yW2hVCl9fR_nXv9GOHphWjN_GGp6tfcpR8A2Lr3CoSPrFn-8p_eJFYW2A5O3uGt-mgtRr2u-MOnUe6RLtRNLrG4-O9H5S4OZr0GmkzEp-ENsq2Q_U5F1ZcTn3tTs7yjnRo-6kPTyt0MBZXbploG6_1wKr-L962OAWMvZGdmzRIwGtGU95Aeb0jxIt47CCjQ4ucovYgEXDAuzhrdvVsRc9krbzCwAltw63pohIhRslcvSqVAM2-FCxGvO6N046gnQq92pSfUStCblJjmYmTBZVhwcP5ONT7zNYz5wmLxG0Po97qW5iFEZOPu4dwEeZ-Al0iOYXs_oZRp-398m0uQKEOsXC0qApuqrMJT4K4FMAopZWbcQZucZOcQBq7irkhCzaxln0Or1hPTQ_y6yj1lzTxlaCdCn5xqITVuEEy6zMvTNunYjhZctv8IF0udk63W0B7ItBSA8y4l9I9jOjt5sIXoOmflwEMsA1GDSAP_bd30YeBWvwEA')