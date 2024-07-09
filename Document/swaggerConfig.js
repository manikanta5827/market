const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Market',
        version: '1.0.0',
      },
      servers:[{
        url:'http://localhost:3000/ '
      }]
    },
    apis: ['./main/router.js'], // Path to the API docs
  };
  
  const specs = swaggerJsdoc(options);

  module.exports=specs;