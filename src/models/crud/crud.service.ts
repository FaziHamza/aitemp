import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { CrateDbService } from 'src/common/common/crateDb.service';
import { QueryGenratorService } from 'src/shared/services/query-genrator/query-genrator.service';

@Injectable()
export class CrudService {
    constructor(private readonly crateDbService: CrateDbService,
        private queryGenratorService: QueryGenratorService,
        ) { }

    async create(table: string, data: any, organizationId, appId): Promise<number> {
        try {
            let newData = JSON.parse(JSON.stringify(data));
            console.log(newData);
            for (let key in newData) {
                if (key === 'organizationid') {
                    newData.organizationid = organizationId;
                } else if (key === 'applicationid') {
                    newData.applicationid = appId;
                }
                // if (newData[key]) {
                //   if (this.isBase64Audio(newData[key])) {
                //     const path = require('path'); // Import the path module
                //     const audioBuffer = this.decodeBase64ToAudio(newData[key]);
                //     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                //     const audioFilePath = path.join('./uploads', `audio-${uniqueSuffix}.wav`);
                //     this.saveAudioToFile(audioBuffer, audioFilePath);
                //     newData[key] = audioFilePath; // Update the key in modalData with the audio file path
                //     console.log(`Audio file saved at: ${audioFilePath}`);
                //   }
                // }
            }
            data = JSON.parse(JSON.stringify(newData));
            console.log('updated data : ' + JSON.stringify(data));
            const { query, values } = this.queryGenratorService.generateInsertQuery(`dev_meta.${table}`, data);
            const insertResult = await this.crateDbService.executeQuery(query);

            //   const [id] = await this.knex(table).insert(data).returning('id');

            //   const valuesString = toInsert.map(item => `(${Object.values(item).map(value => `'${value}'`).join(', ')})`).join(', ');
            //   const insertQuery = `INSERT INTO  ${modelType} (${Object.keys(toInsert[0]).join(', ')}) VALUES ${valuesString} RETURNING *`;
            //   insertResult = await this.crateDbService.executeQuery(insertQuery);
            return insertResult?.data[0]?.id;
        } catch (error) {
            throw new Error(`Failed to create record: ${error.message}`);
        }
    }



    async read(table: string): Promise<any> {
        const cmd = `SELECT * FROM dev_meta.${table}`;
         const result =  await this.crateDbService.executeQuery(cmd);
        // const result = await this.knex(table).select();
        return result.data;
    }

    async readById(table: string, id: number): Promise<any> {
        const cmd = `SELECT * FROM dev_meta.${table}  Where  id  = '${id}'`;
        const result =  await this.crateDbService.executeQuery(cmd);
        return result.data;
    }

    async update(table: string, id: number, data: any): Promise<void> {
        const cmd = `SELECT * FROM dev_meta.${table}  Where  id  = '${id}'`;
        const result =  await this.crateDbService.executeQuery(cmd);
        return result.data;
    }

    async delete(table: string, id: number): Promise<void> {
        const cmd = `SELECT * FROM dev_meta.${table}  Where id  = '${id}'`;
        const result =  await this.crateDbService.executeQuery(cmd);
        return result.data;
    }

    async getPending(table: string, screenBuilderId?: string): Promise<any> {
        const cmd = `SELECT * FROM dev_meta.${table}  Where  screenbuilderid = '${screenBuilderId}'`;
        const result =  await this.crateDbService.executeQuery(cmd);
        return result.data;
    }
    isBase64Audio(data: string): boolean {
        if (typeof data === 'string') {
            return data.startsWith('data:audio/');
        } else {
            return false
        }
    }

    decodeBase64ToAudio(base64Data: string): Buffer {
        return Buffer.from(base64Data.split(',')[1], 'base64');
    }
    saveAudioToFile(audioData: Buffer, filePath: string): void {
        fs.writeFileSync(filePath, audioData);
    }
}
