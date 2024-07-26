const express=require('express');
const app=express();
const createError=require('http-errors');
require("dotenv").config()
require('../DB/mongoConnection')
const Router=require("./router")
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const morgan = require("morgan");
const swaggerUi = require('swagger-ui-express');
const specs=require('../Document/swaggerConfig');
const { object } = require('yup');
app.use(morgan("dev"));

app.use("/auth", Router);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.get('/',(req,res)=>{
    res.send('Hello World');
});

app.use((req, res, next) => {
    next(createError.NotFound());
  });
  
  app.use((error, req, res, next) => {
   if((typeof error.message)==="object"){
    // console.error(error.message)
    error.message = error.message.message;
   }
    res.status(error.status).send({
      status: error.status,
      message: error.message
    });
  });
  
  const port = process.env.port;

app.listen(port,()=>{
    console.log('Server is running on port t '+port);
});