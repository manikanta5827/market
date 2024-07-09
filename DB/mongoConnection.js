const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MONGOURL)
  .then(() => console.log("Mongoose successfully connected[ INITIAL ]"))
  .catch((err) => console.log(err + "[ INITIAL ]"));

mongoose.connection.on("error", (err) =>
  console.log("Failed to connect to Mongoose[ RUNTIME ]" + err)
);
