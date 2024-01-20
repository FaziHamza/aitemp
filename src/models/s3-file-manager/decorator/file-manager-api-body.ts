/**dependencies */
import { ApiBody } from '@nestjs/swagger';
/**custom file upload interceptors */
const path = 'path';
export const FileManagerApiBody =
  (files = 'files'): MethodDecorator =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    ApiBody({
      type: 'multipart/form-data',
      required: true,
      schema: {
        type: 'object',
        properties: {
          [path]: {
            type: 'string',
            description: 'file upload path',
            maxLength: 200,
            nullable: false,
            example: 'user/list',
          },
          [files]: {
            type: 'array',
            description: 'file data',
            nullable: false,
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    })(target, propertyKey, descriptor);
  };
