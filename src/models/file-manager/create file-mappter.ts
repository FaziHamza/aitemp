// import { Request } from 'express';

interface FileMapper {
    file: Express.Multer.File;
    // req: Request;
  }
  
  interface FilesMapper {
    files: Express.Multer.File[];
    // req: Request;
  }
  
  export const fileMapper = ({ file }: FileMapper) => {
    // const image_url = `${req.protocol}://${req.headers.host}/${file.path}`;
    return {
      ...file,
    };
  };
  
  export const filesMapper = ({ files }: FilesMapper) => {
    return files.map((file) => {
      return {
        ...file,
      };
    });
  };
  