const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const customerSalesSchema = new Schema({
  Name: {
    type: String,
    required: true,
  },
  Item: {
    type: String,
    required: true,
  },
  Bags: {
    type: Number,
    default: 1,
  },
  Weight: {
    type: Number,
    default: 50,
  },
  Cooly: {
    type: Number,
    default: 10,
  },
  Price: {
    type: Number,
    required: true,
  },
  Amount: {
    type: Number,
    required: true,
  },
  Date: {
    type: Date,
    default: Date.now(),
  },
});

const customerCashSchema = new Schema({
  Name: {
    type: String,
    required: true,
  },
  cashType: {
    type: String,
    default: "cash",
  },
  Amount: {
    type: Number,
    required: true,
  },
  Date: {
    type: Date,
    default: Date.now(),
  },
});

const customerBalanceSchema = new Schema({
  Name: {
    type: String,
    required: true,
  },
  Balance: {
    type: Number,
    required: true,
  },
});

const customerDetailsSchema = new Schema({
  Name: {
    type: String,
    required: true,
  },
  Number: {
    type: Number,
    required: true,
  },
});

const customerSales = mongoose.model(
  "customerSales",
  customerSalesSchema,
  "customerSales"
);

const customerCash = mongoose.model(
  "customerCash",
  customerCashSchema,
  "customerCash"
);

const customerBalance = mongoose.model(
  "customerBalance",
  customerBalanceSchema,
  "customerBalance"
);

const customerDetails = mongoose.model(
  "customerDetails",
  customerDetailsSchema,
  "customerDetails"
);

module.exports = {
  customerSales,
  customerCash,
  customerBalance,
  customerDetails,
};
