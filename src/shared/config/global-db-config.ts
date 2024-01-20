/* eslint-disable prettier/prettier */
export const DB_CONFIG = {
  SQL: {
    client: 'mssql',
    host: 'SQL5106.site4now.net',
    sqlPort: 1433,
    database: 'db_a5637b_fastify09',
    username: 'db_a5637b_fastify09_admin',
    password: 'fastify09',
  },
  POSTGRESS: {
    client: 'pg',
    host: 'localhost',
    sqlPort: 5432,
    database: 'categoryPracticeDB',
    username: 'postgres',
    password: 'HgKhhOCAOqx3UFQ25deaU7hdxWTHPiABxOUfPsvzqXc',
  },
  CRATEDB: {
    url: "postgres://admin:aiappup2024@172.23.0.7:5432",
    mode:"dev_"
  }
};




export const EMAIL_CONFIG = {
  EMAIL: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: 'arfanali.cloud@gmail.com', // generated ethereal user
    pass: 'ibifodcrfbavneht', // generated ethereal password
    from: 'arfanal.cloud@gmail.com', // outgoing email ID
  }
}
export const SPECTRUM_CONFIG = {
  SPECTRUM: {
    email: 'support@gmail.com',
    webistUrl: 'https://expocitydubai.com/en/',
    ContactInformation: '+971543060723',
    // serverPath:'https://spectrum.expocitydubai.com:9443/'
    serverPath: 'http://localhost:4500/',
    nestImageUrl:"http://campaigns.expocitydubai.com.s3-website.me-south-1.amazonaws.com/",
  }
}

export const SECRETS={
  secretKey :'0193c29ad58f4211bde65108419095c45eb363e05e70c66a48f40b2d4c807176'
}