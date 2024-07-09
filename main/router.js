const express = require("express");
const router = express.Router();

const {
  customerSales,
  customerBalance,
  customerCash,
  customerDetails,
} = require("../DB/dbSchema");
const createError = require("http-errors");

//customer Sales 

/**
 * @swagger
 * /auth/salesEntry:
 *   post:
 *     summary: Record multiple sales entries
 *     description: Adds multiple sales entries to the database and updates the balance of each customer accordingly.
 *     tags:
 *       - Customer Sales
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 Name:
 *                   type: string
 *                   example: K K.
 *                 Item:
 *                   type: string
 *                   example: Onion.
 *                 Bags:
 *                   type: number
 *                   example: 10.
 *                 Weight:
 *                   type: number
 *                   example: 50.
 *                 Cooly:
 *                   type: number
 *                   example: 10.
 *                 Price:
 *                   type: number
 *                   example: 20.
 *     responses:
 *       200:
 *         description: Sales entries recorded successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: success
 *       400:
 *         description: Invalid request body.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */

router.post("/salesEntry", async (req, res, next) => {
  try {
    let array = req.body;
    for (let i = 0; i < array.length; i++) {
     
      if(!await customerBalance.findOne({Name:array[i].Name})){
      return next(createError.Unauthorized(`Customer with Name ${array[i].Name} not found ...Create a new customer account`))
      }
      if(!array[i].Price||!array[i].Item||!array[i].Name){
        return next(createError.BadRequest("Invalid request body at index "+(i+1)));
      }
      array[i].Amount =
        array[i].Price * (array[i].Weight||50) * (array[i].Bags||1) +
        (array[i].Bags||1) * (array[i].Cooly||10);
    }
    //  console.log(array);
    await customerSales.insertMany(array);
    //updating balance amount of every user
    let users = new Map();
    let names = [];
    for (let i = 0; i < array.length; i++) {
      let object = array[i];
      if (users.has(object.Name)) {
        users.set(object.Name, users.get(object.Name) + object.Amount);
      } else {
        users.set(object.Name, object.Amount);
        names.push(object.Name);
      }
    }
    // console.log(users)
    //  console.log(names)
    //add this sales to every user balance and insert them into customer Balance
    const out = await customerBalance.find({ Name: { $in: names } });
      //  console.log(out)
    for (let i = 0; i < out.length; i++) {
      let object = out[i];
      object.Balance = object.Balance + users.get(object.Name);
      await customerBalance.updateOne(
        { Name: object.Name },
        { Balance: object.Balance }
      );
    }
    res.status(200).send("Customer sales Inserted successfully");
  } catch (error) {
     console.log(error);
    next(createError.Unauthorized(error));
  }
});

/**
 * @swagger
 * /auth/updateCustomerSales:
 *   put:
 *     summary: Update customer sales details
 *     description: Updates sales details for a customer and also updates the customer's balance accordingly.
 *     tags:
 *       - Customer Sales
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 example: The ID of the sales record to update.
 *               Name:
 *                 type: string
 *                 example: K K
 *               Item:
 *                 type: string
 *                 example: Onion.
 *               Bags:
 *                 type: number
 *                 example: 1
 *               Weight:
 *                 type: number
 *                 example: 50
 *               Cooly:
 *                 type: number
 *                 example: 10
 *               Price:
 *                 type: number
 *                 example: 25
 *               Date:
 *                 type: string
 *                 format: date
 *                 example: "yyyy-MM-dd"
 *     responses:
 *       200:
 *         description: Successfully updated customer sales and balance.
 *       401:
 *         description: Unauthorized
 */

router.put("/updateCustomerSales", async (req, res, next) => {
  try {
    if (!req.body||!req.body._id||!req.body.Name||!req.body.Item||!req.body.Price) {
      throw createError.Unauthorized("Details not found");
    }
    const data = req.body;
    const oldId = data._id;
    const Name = data.Name;
    const updateData = {
      Item: data.Item,
      Bags: (data.Bags||1),
      Weight: (data.Weight||50),
      Cooly: (data.Cooly||10),
      Price: data.Price,
      Amount: data.Price * (data.Weight||50) * (data.Bags||1) + (data.Bags||1) * (data.Cooly||10),
      Date: (data.Date||Date.now()),
    };

    const object = await customerSales.find(
      { _id: oldId },
      { _id: 0, Amount: 1 }
    );
    const oldAmount = object[0].Amount;

    await customerSales.findByIdAndUpdate(oldId, updateData);
    //update customer balance also
    const obj = await customerBalance.find({ Name: Name });
    const oldBalance = obj[0].Balance;
    const newBalance = oldBalance - oldAmount + updateData.Amount;
    // console.log(Balance)
    await customerBalance.updateOne({ Name: Name }, { Balance: newBalance });
    res.status(200).send("Customer sales updated successfully");
  } catch (error) {
    console.log(error);
    next(createError.Unauthorized(error));
  }
});

/**
 * @swagger
 * /auth/deleteCustomerSales:
 *   delete:
 *     summary: Delete customer sales Details
 *     description: Deletes a sales entry for a customer .
 *     tags:
 *       - Customer Sales
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 example: The ID of the sales record to delete - 668cdb46656fd7ed300228d8.              
 *     responses:
 *       200:
 *         description: Successfully deleted customer sales entry and updated balance.
 *       401:
 *         description: Unauthorized
 */

router.delete("/deleteCustomerSales", async (req, res, next) => {
  try {
    if (!req.body) {
      throw createError.Unauthorized("Details not found");
    }
    const id = req.body._id;
    
    // by using id we can delete entry in sales
  const data= await customerSales.findByIdAndDelete(id)
  const Name=data.Name;
  const Amount=data.Amount;
      
    // by using name we can alter the balance of customer
    const obj = await customerBalance.find({ Name: Name });
    const oldBalance = obj[0].Balance;
    const newBalance = oldBalance - Amount;

    await customerBalance.updateOne({ Name: Name }, { Balance: newBalance });
    res.send("Sales with Id Deleted successfully.");
  } catch (error) {
    console.log(error);
    next(createError.Unauthorized('Sales with Id not Found'));
  }
});


////Customer Cash
/**
 * @swagger
 * /auth/cashEntry:
 *   post:
 *     summary: Add cash entries
 *     description: Adds cash entries and updates the balance for each customer.
 *     tags:
 *       - Customer Cash
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 Name:
 *                   type: string
 *                   description: The name of the customer.
 *                   example: Jane Doe
 *                 Amount:
 *                   type: number
 *                   description: The amount of cash.
 *                   example: 100
 *                 cashType:
 *                   type: string
 *                   description: The type of cash entry.
 *                   example: Cash || Online
 *                 Date:
 *                   type: string
 *                   format: date
 *                   description: The date of the cash entry.
 *                   example: 2023-07-08
 *     responses:
 *       200:
 *         description: Cash inserted successfully
 *       401:
 *         description: Unauthorized
 */

router.post("/cashEntry", async (req, res, next) => {
  try {
    if (!req.body) {
      next(createError.Unauthorized('Missing Body'))
    }
    let array = req.body;
    //Group them
    for (let i = 0; i < array.length; i++) {
      let object = array[i];
      if(!await customerBalance.findOne({Name:object.Name})){
        return next(createError.Unauthorized(`Customer with Name ${array[i].Name} not found ...Create a new customer account`))
        }
      //cash table update
      let obj = {
        Name: object.Name,
        Amount: object.Amount,
        cashType: (object.cashType||"cash"),
        Date: (object.Date||Date.now())
      };
      object = new customerCash(obj);
      await object.save();
    }

    let users = new Map();
    let names = [];
    for (let i = 0; i < array.length; i++) {
      let object = array[i];
      if (users.has(object.Name)) {
        users.set(object.Name, users.get(object.Name) + object.Amount);
      } else {
        users.set(object.Name, object.Amount);
        names.push(object.Name);
      }
    }
    // console.log(users,names)
    let oldBFData = await customerBalance.find({ Name: { $in: names } });

    for (let i = 0; i < oldBFData.length; i++) {
      //balance table update
      let object = oldBFData[i];
      object.Balance = object.Balance - users.get(object.Name);
      await customerBalance.updateOne(
        { Name: object.Name },
        { Balance: object.Balance }
      );
    }
    res.send("cash inserted successfully");
  } catch (error) {
    next(createError.Unauthorized(error));
  }
});
/**
 * @swagger
 * /auth/updateCustomerCash:
 *   put:
 *     summary: Update customer cash transaction
 *     description: Updates a customer's cash transaction and updates the customer's balance accordingly.
 *     tags:
 *       - Customer Cash
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 example: The ID of the cash transaction to update - 668d0ece23d5658540a4ffa0.
 *               Name:
 *                 type: string
 *                 example: K K
 *               cashType:
 *                 type: string
 *                 example: Cash || Online
 *               Amount:
 *                 type: number
 *                 example: 5000
 *               Date:
 *                 type: string
 *                 format: date
 *                 example: Date of the cash transaction.
 *     responses:
 *       200:
 *         description: Cash transaction updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: success
 *       400:
 *         description: Invalid request body.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Cash transaction not found.
 */

router.put("/updateCustomerCash", async (req, res, next) => {
  try {
    if (!req.body||!req.body.Name||!req.body.Amount) {
      next(createError.Unauthorized("Missing request body"))
    }
    let data = req.body;
    const id = data._id;
    const Name = data.Name;
    const updateData = {
      cashType: (data.cashType||"cash"),
      Amount: data.Amount,
      Date: (data.Date||Date.now()),
    };
    const object = await customerCash.find({ _id: id }, { Amount: 1 });
    const oldAmount = object[0].Amount;

    await customerCash.findByIdAndUpdate(id, updateData);

    //update customer balance also
    const obj = await customerBalance.find({ Name: Name });
    const oldBalance = obj[0].Balance;
    const newBalance = oldBalance - oldAmount + updateData.Amount;

    await customerBalance.updateOne({ Name: Name }, { Balance: newBalance });
    res.send("Customer Cash Updated Successfully");
  } catch (error) {
    // console.log(error);
    next(createError.Unauthorized(error));
  }
});

/**
 * @swagger
 * /auth/deleteCustomerCash:
 *   delete:
 *     summary: Delete customer cash transaction
 *     description: Deletes a customer's cash transaction and adjusts the customer's balance accordingly.
 *     tags:
 *       - Customer Cash
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 example: The ID of the cash transaction to delete - 668d0ca66bbde7d1db7b4758
 *               
 *     responses:
 *       200:
 *         description: Cash transaction deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: success
 *       400:
 *         description: Invalid request body.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Cash transaction not found.
 */

router.delete("/deleteCustomerCash", async (req, res, next) => {
  try {
    if (!req.body) {
      next(createError.Unauthorized("Missing request body"))
    }
    const id = req.body._id;
   const data= await customerCash.findByIdAndDelete(id);
   const Name=data.Name;
   const Amount=data.Amount;
    // by using name we can alter the balance of customer
    const obj = await customerBalance.find({ Name: Name });
    const oldBalance = obj[0].Balance;
    const newBalance = oldBalance - Amount;

    await customerBalance.updateOne({ Name: Name }, { Balance: newBalance });
    res.send(`Cash Transaction with ID ${id}  deleted successfully`);
  } catch (error) {
    console.log(error);
    next(createError.Unauthorized(error));
  }
});

//Bills

/**
 * @swagger
 * /auth/customerBills:
 *   post:
 *     summary: Get customer bills for a specific date
 *     description: Retrieves customer sales and cash details for a given date, along with the updated balances.
 *     tags:
 *       - Bills
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date for which to retrieve the customer bills.
 *                 example: 2023-07-08
 *     responses:
 *       200:
 *         description: Successfully retrieved customer bills
 *       401:
 *         description: Unauthorized
 */
router.post("/customerBills", async (req, res, next) => {
  try {
    if (!req.body.date) {
      throw createError.Unauthorized("Date required");
    }
    // task (i)
    let date = req.body.date;
    let startDate = new Date(date);
    let endDate = new Date(startDate);
    // console.log(date, startDate, endDate);
    endDate.setDate(endDate.getDate() + 1);

    const salesList = await customerSales.aggregate([
      {
        $match: {
          Date: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$Name",
          Sales: {
            $push: {
             
              Item: "$Item",
              Bags: "$Bags",
              Weight: "$Weight",
              Cooly: "$Cooly",
              Price: "$Price",
              Amount: "$Amount",
            },
          },
          TotalAmount: {
            $sum: "$Amount",
          },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Sales: 1,
          Total: "$TotalAmount",
        },
      },
    ]);
    // console.log(salesList);

    let salesListMap = new Map();
    for (let i = 0; i < salesList.length; i++) {
      let object = salesList[i];
      salesListMap.set(object.Name, {
        Sales: object.Sales,
        Total: object.Total,
      });
    }
    // console.log("salesList");
    // console.log([...salesListMap]);
    //to get user names
    let users = [];
    for (let i = 0; i < salesList.length; i++) {
      let object = salesList[i];
      users.push(object.Name);
    }
    // console.log(users);

    //task (iii)
    //to fetch cash of customers
    //fetching customer cash details of last date
    // console.log(balanceList)
    let dateObj = new Date(date);
    dateObj = dateObj.setDate(dateObj.getDate() - 2);
    startDate = new Date(dateObj);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2);
    // console.log(startDate, endDate);
    const cashList = await customerCash.aggregate([
      {
        $match: {
          Date: { $gt: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$Name",
          cash: {
            $push: { cashType: "$cashType", Amount: "$Amount" },
          },
          totalCash: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          cash: 1,
          totalCash: 1,
        },
      },
    ]);
    let cashListMap = new Map();
    let cashUsers = [];
    for (let i = 0; i < cashList.length; i++) {
      let object = cashList[i];
      cashListMap.set(object.Name, {
        cash: object.cash,
        Amount: object.totalCash,
      });
      cashUsers.push(object.Name);
    }
    // console.log(cashUsers);
    //  console.log([...cashListMap])
    const unionSet = new Set([...users, ...cashUsers]);
    const commonElements = Array.from(unionSet);
    // console.log("commonElements : " + commonElements);
    //task (ii)1
    //to fetch balance of customers
    const balanceList = await customerBalance.find({
      Name: { $in: commonElements },
    });
    let balanceMap = new Map();
    for (let i = 0; i < balanceList.length; i++) {
      let object = balanceList[i];
      balanceMap.set(object.Name, object.Balance);
    }
    //task (ii)2
    //
    startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    // console.log(startDate,endDate)
    const salesAllList = await customerSales.aggregate([
      {
        $match: {
          Name: { $in: commonElements },
          Date: { $gt: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$Name",
          TotalAmount: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Amount: "$TotalAmount",
        },
      },
    ]);
    // console.log(salesAllList);
    let salesAllListMap = new Map();
    for (let i = 0; i < salesAllList.length; i++) {
      let object = salesAllList[i];
      salesAllListMap.set(object.Name, object.Amount);
    }

    //task  (ii)3
    startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 2);
    endDate = new Date();
    // console.log(startDate,endDate)
    const cashAllList = await customerCash.aggregate([
      {
        $match: {
          Name: { $in: commonElements },
          Date: { $gt: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$Name",
          TotalAmount: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Amount: "$TotalAmount",
        },
      },
    ]);
    let cashAllListMap = new Map();
    for (let i = 0; i < cashAllList.length; i++) {
      let object = cashAllList[i];
      cashAllListMap.set(object.Name, object.Amount);
    }

    //calculate balance of every user
    let opBalance = new Map();
    for (let i = 0; i < commonElements.length; i++) {
      let cash = 0;
      if (!cashAllListMap.has(commonElements[i])) {
        cash = 0;
      } else cash = cashAllListMap.get(commonElements[i]);
      opBalance.set(
        commonElements[i],
        balanceMap.get(commonElements[i]) -
          salesAllListMap.get(commonElements[i]) +
          cash
      );
    }
    // console.log([...opBalance]);
    //printing the sales bill of all users on particular date
    let response=[];
    for (let i = 0; i < commonElements.length; i++) {
      let name = commonElements[i];

      let TotalSales = 0;
      let Cash = 0;
      let Balance=0;
      
        let object={
          Date:date,
          Name:name
        }
     console.log(object)
      //sales print
      if (users.includes(name)) {
        let obj = salesListMap.get(name);

        object.Items=obj.Sales;
        TotalSales=obj.Total
        object.TotalSales = TotalSales; 
      }
      console.log(object)
      // console.log("OPBalance : " + opBalance.get(name));
      //cash Given
      object.BF=opBalance.get(name);
      if (cashListMap.has(name)) {
        let obj = cashListMap.get(name);
        Cash = obj.Amount;
        object.cash = obj.cash;
        
      }
      console.log(object)
      
      object.Balance=object.BF+TotalSales-Cash;
      // console.log("Balance :" + (opBalance.get(name) + TotalSales - cash));

     console.log(object);
      response.push(object);
      console.log(response);

    }

    res.send(response);
  } catch (error) {
    next(createError.Unauthorized(error));
  }
});

/**
 * @swagger
 * /auth/ownerBill:
 *   post:
 *     summary: Get owner bill for a specific date
 *     description: Retrieves sales, balance, and cash details of customers for a given date, along with the updated balances.
 *     tags:
 *       - Bills
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: The date for which to retrieve the owner bill.
 *                 example: 2023-07-08
 *     responses:
 *       200:
 *         description: Successfully retrieved owner bill
 *       401:
 *         description: Unauthorized
 */

router.post("/ownerBill", async (req, res, next) => {
  try {
    if (!req.body.date) {
      throw createError.Unauthorized("Date required");
    }

    //calculate slaes of users
    let date = req.body.date;
    let startDate = new Date(date);
    let endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    // console.log('hii br')
    const salesList = await customerSales.aggregate([
      {
        $match: {
          Date: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$Name",
          TotalAmount: {
            $sum: "$Amount",
          },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Total: "$TotalAmount",
        },
      },
    ]);
    // console.log('hii')
    //  console.log("salesList"+salesList);

    let salesListMap = new Map();
    for (let i = 0; i < salesList.length; i++) {
      let object = salesList[i];
      salesListMap.set(object.Name, object.Total);
    }
    // console.log("salesList");
    // console.log([...salesListMap]);
    //to get user names
    let commonElements = [];
    for (let i = 0; i < salesList.length; i++) {
      let object = salesList[i];
      commonElements.push(object.Name);
    }
    // console.log("User's : " + commonElements);

    //calculate B>F of all users
    //task (ii)1
    //to fetch balance of customers
    const balanceList = await customerBalance.find({
      Name: { $in: commonElements },
    });
    let balanceMap = new Map();
    for (let i = 0; i < balanceList.length; i++) {
      let object = balanceList[i];
      balanceMap.set(object.Name, object.Balance);
    }
    // console.log("Balancemap : " + [...balanceMap]);
    //task (ii)2
    //
    startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    // console.log(startDate,endDate)
    const salesAllList = await customerSales.aggregate([
      {
        $match: {
          Name: { $in: commonElements },
          Date: { $gt: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$Name",
          TotalAmount: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Amount: "$TotalAmount",
        },
      },
    ]);
    // console.log(salesAllList)
    let salesAllListMap = new Map();
    for (let i = 0; i < salesAllList.length; i++) {
      let object = salesAllList[i];
      salesAllListMap.set(object.Name, object.Amount);
    }
    // console.log("salesAlllistmap : " + [...salesAllListMap]);

    //task  (ii)3
    startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 2);
    endDate = new Date();
    // console.log(startDate, endDate);
    const cashAllList = await customerCash.aggregate([
      {
        $match: {
          Name: { $in: commonElements },
          Date: { $gt: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$Name",
          TotalAmount: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Amount: "$TotalAmount",
        },
      },
    ]);
    // console.log("cashAllList : "+[...cashAllList])
    let cashAllListMap = new Map();
    for (let i = 0; i < cashAllList.length; i++) {
      let object = cashAllList[i];
      cashAllListMap.set(object.Name, object.Amount);
    }
    // console.log("cashAllListMap: " + [...cashAllListMap]);
    //calculate balance of every user
    let opBalance = new Map();
    for (let i = 0; i < commonElements.length; i++) {
      let cash = 0;
      if (!cashAllListMap.has(commonElements[i])) {
        cash = 0;
      } else cash = cashAllListMap.get(commonElements[i]);
      opBalance.set(
        commonElements[i],
        balanceMap.get(commonElements[i]) -
          salesAllListMap.get(commonElements[i]) +
          cash
      );
    }
    // console.log("opBalance : " + [...opBalance]);

    //cash of all users on last date

    //task (iii)
    //to fetch cash of customers
    //fetching customer cash details of last date
    // console.log(balanceList)

    startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 2);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2);
    // console.log(startDate, endDate);
    const cashList = await customerCash.aggregate([
      {
        $match: {
          Date: { $gt: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$Name",
          totalCash: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          totalCash: 1,
        },
      },
    ]);
    let cashListMap = new Map();
    for (let i = 0; i < cashList.length; i++) {
      let object = cashList[i];
      cashListMap.set(object.Name, {
        Amount: object.totalCash,
      });
    }
    let array=[];
    for (let i = 0; i < commonElements.length; i++) {
      let name = commonElements[i];
      let cash = 0;

      if (cashListMap.has(name)) {
        object = cashListMap.get(name);
        cash = object.Amount;
      }
      let BaF = opBalance.get(name) - cash;
      let sales = salesListMap.get(name);
      let Total = BaF + sales;
      let object={
        Date:date,
        Name:name,
        Sales:sales,
        BF:BaF,
        Total:Total
      }
      array.push(object)

    }

    res.send(array);
  } catch (error) {
    console.log(error);
    next(createError.Unauthorized(error));
  }
});

/**
 * @swagger
 * /auth/customerBillRange:
 *   post:
 *     summary: Get customer bill within a date range
 *     description: Retrieves sales, cash transactions, and balances of a customer within a specified date range.
 *     tags:
 *       - Bills
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: The start date of the range to retrieve bills.
 *                 example: 2023-07-01
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: The end date of the range to retrieve bills.
 *                 example: 2023-07-31
 *               Name:
 *                 type: string
 *                 description: The name of the customer.
 *                 example: John Doe
 *     responses:
 *       200:
 *         description: Successfully retrieved customer bill within the date range
 *       401:
 *         description: Unauthorized
 */

router.post("/customerBillRange", async (req, res, next) => {
  try {
    if (!(req.body.startDate || req.body.Name || req.body.endDate)) {
      next(createError.Unauthorized("Missing data"));
    }
    let Name = req.body.Name;
    let startDate = new Date(req.body.startDate);
    let endDate = new Date(req.body.endDate);

    const salesList = await customerSales.aggregate([
      // Match documents within the date range and with the specified name
      {
        $match: {
          Name: Name,
          Date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      // Group by date
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$Date" } },
          documents: {
            $push: {
              _id: "$_id",
              Item: "$Item",
              Bags: "$Bags",
              Weight: "$Weight",
              Cooly: "$Cooly",
              Price: "$Price",
              Amount: "$Amount",
            },
          },
          totalAmount: { $sum: "$Amount" },
        },
      },
      // Sort by date
      {
        $sort: { _id: 1 },
      },
      // Format the output
      {
        $project: {
          _id: 0,
          Date: "$_id",
          documents: 1,
          Amount: "$totalAmount",
        },
      },
    ]);
    //  console.log(sales)
    let salesListMap = new Map();
    for (let i = 0; i < salesList.length; i++) {
      let object = salesList[i];
      salesListMap.set(object.Date, {
        sales: object.documents,
        Amount: object.Amount,
      });
    }

    // console.log("salesList of user : " + [...salesListMap]);
    //task 2
    //  console.log(startDate,endDate)
    let sd = new Date(startDate);
    let ed = new Date(endDate);
    sd.setDate(startDate.getDate() - 1);
    ed.setDate(endDate.getDate() - 1);

    const cashList = await customerCash.aggregate([
      {
        $match: {
          Name: Name,
          Date: {
            $gte: new Date(sd),
            $lte: new Date(ed),
          },
          Amount: { $ne: 0 }, // Exclude documents where Amount is zero
        },
      },
      // Group by date
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$Date" } },
          transactions: {
            $push: {
              _id: "$_id",
              cashType: "$cashType",
              Amount: "$Amount",
            },
          },
          totalAmount: { $sum: "$Amount" },
        },
      },
      // Sort by date
      {
        $sort: { _id: 1 },
      },
      // Format the output
      {
        $project: {
          _id: 0,
          Date: "$_id",
          cash: "$transactions",
          Amount: "$totalAmount",
        },
      },
    ]);

    let cashListMap = new Map();
    for (let i = 0; i < cashList.length; i++) {
      let object = cashList[i];

      cashListMap.set(object.Date, {
        cash: object.cash,
        Amount: object.Amount,
      });
    }

    // console.log("cashList of user : " + [...cashListMap]);

    //task 3 to get op balance
    const balance = await customerBalance.find({
      Name: Name,
    });

    sd.setDate(startDate.getDate() - 1);
    ed = new Date();
    ed.setDate(endDate.getDate() + 1);

    const salesAll = await customerSales.aggregate([
      {
        $match: {
          Name: Name,
          Date: { $gt: sd, $lt: ed },
        },
      },
      {
        $group: {
          _id: "$Name",
          TotalAmount: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Amount: "$TotalAmount",
        },
      },
    ]);
    //  console.log(salesAll)

    // startDate = new Date(date);
    // console.log("Date")
    // console.log(startDate,endDate)
    sd.setDate(startDate.getDate() - 2);
    ed = new Date();
    // console.log(startDate,endDate)
    const cashAll = await customerCash.aggregate([
      {
        $match: {
          Name: Name,
          Date: { $gt: sd, $lt: ed },
        },
      },
      {
        $group: {
          _id: "$Name",
          TotalAmount: { $sum: "$Amount" },
        },
      },
      {
        $project: {
          _id: 0,
          Name: "$_id",
          Amount: "$TotalAmount",
        },
      },
    ]);
    // console.log(cashAll)

    //opbalance
    let opB = 0;
    function opBalance(balance, cashAll, salesAll) {
      // console.log(balance, cashAll, salesAll)
      let cash = 0,
        sales = 0;
      if (cashAll) {
        cash = cashAll[0].Amount;
      }
      if (salesAll) {
        sales = salesAll[0].Amount;
      }
      balance = balance[0].Balance;
      // console.log(balance - sales + cash)
      return balance - sales + cash;
    }
    opB = opBalance(balance, cashAll, salesAll);
    console.log("open balance ; "+opB)
    const differenceInMs = endDate - startDate;
    const differenceInDays = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));

    // Example usage in a loop
    let date = new Date(startDate);
    let past = new Date(startDate);
    past.setDate(past.getDate() - 1);
    // console.log(date, past);
    console.log();
    console.log("  SRI   " + Name);
    let array=[];
    
    for (let i = 0; i < differenceInDays + 1; i++) {
      
      // console.log(date, past);
      let cdate = date.toISOString().slice(0, 10);
      let cpast = past.toISOString().slice(0, 10);
      if (salesListMap.has(cdate) || cashListMap.has(cpast)) {
        let object={
          Name:Name,
          Date:cdate
        }
        let salesAmount = 0;
        let cashAmount = 0;
        if (salesListMap.has(cdate)) {
          obj = salesListMap.get(cdate);
          salesAmount = obj.Amount;
          object.Sales=obj.sales
          object.TotalSales=salesAmount;
        }
        object.BF=opB;
        if (cashListMap.has(cpast)) {
          obj = cashListMap.get(cpast);
          cashAmount = obj.Amount;
          object.Cash=obj.cash;
        }
        opB=opB - cashAmount + salesAmount;
        object.Balance=opB;
       array.push(object);
      }
      date.setDate(date.getDate() + 1);
      past.setDate(past.getDate() + 1);
    }

    res.send(array);
  } catch (error) {
    console.log(error);
    next(createError.Unauthorized(error));
  }
});


//customers Info

/**
 * @swagger
 * /auth/createCustomer:
 *   post:
 *     summary: Create a new customer
 *     description: Creates a new customer and initializes their accounts in the Cash and Balance tables.
 *     tags:
 *       - Customers Info
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 Name:
 *                   type: string
 *                   description: The name of the customer.
 *                   example: John Doe
 *                 Number:
 *                   type: string
 *                   description: The contact number of the customer.
 *                   example: 1234567890
 *                 
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 */
router.post("/createCustomer", async (req, res, next) => {
  try {

    //check if request body is empty
    if(!req.body[0]||(req.body.Name===""||req.body.Number==="")){
      return next(createError.Unauthorized("Invalid request body"))
    }
    let user = req.body[0];
    let customer = {
      Name: user.Name,
      Number: user.Number,
    };
     //check if user exists with that Name
     const data = await customerDetails.find({ Name: user.Name });
     if (data[0]) {
       // console.log('Customer not found')
       return  next(createError.Unauthorized("Customer found with Existing Name Choose another Name"))
     }

    //saving new customer
    let newCustomer = new customerDetails(customer);
    await newCustomer.save();

    customer = {
      Name: user.Name,
      Amount: 0,
    };
    //creating account in Cash table
    newCustomer = new customerCash(customer);
    await newCustomer.save();

    customer = {
      Name: user.Name,
      Balance: 0,
    };
    //creating account in Balance table
    newCustomer = new customerBalance(customer);
    await newCustomer.save();

    res.status(200).send("New Customer created successfully");
  } catch (error) {
    // console.log(error);
    next(createError.Unauthorized());
  }
});
/**
 * @swagger
 * /auth/customers:
 *   get:
 *     summary: Get all customer details
 *     description: Retrieves details of all customers.
 *     tags:
 *       - Customers Info
 *     responses:
 *       200:
 *         description: Successfully retrieved customer details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   Name:
 *                     type: string
 *                     description: The name of the customer.
 *                   Number:
 *                     type: number
 *                     description: The phone number of the customer.
 *                  
 *       401:
 *         description: Unauthorized
 */

router.get("/customers", async (req, res, next) => {
  try {
    const users = await customerDetails.find({}, { __v: 0 });
    // console.log(users);
    res.send(users);
  } catch (error) {
    next(createError.Unauthorized(error));
  }
});
/**
 * @swagger
 * /auth/updateCustomerDetails:
 *   put:
 *     summary: Update customer details
 *     description: Updates the details of an existing customer. If the customer's name is changed, updates the name in all associated collections.
 *     tags:
 *       - Customers Info
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 description: The ID of the customer to update.
 *                 example: old Customer Id - 668cdb46656fd7ed300228d8
 *               Name:
 *                 type: string
 *                 description: The new name of the customer.
 *                 example: Swami
 *               Phone:
 *                 type: string
 *                 description: The new phone number of the customer.
 *                 example: 9876543211
 *     responses:
 *       200:
 *         description: Customer details updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: updatedUser
 *       400:
 *         description: Invalid request body.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Customer not found.
 */

router.put("/updateCustomerDetails", async (req, res, next) => {
  try {
    // console.log('stage 1')
    if (!req.body) {
      // console.log('error form server side')
      next(createError.Unauthorized("Missing request body"))
    }
    // console.log('stage 2')
    const data = req.body;
    //fetch details of old user
    const oldUser = await customerDetails.findById(data._id);
    //check if user exist
    if (!oldUser) {
       next(createError.Unauthorized("User not found"))
    }
    // console.log(oldUser);
    if(data.Name===""){
      data.Name=oldUser.Name;
    }
    if(data.Number===""){
      data.Number=oldUser.Number;
    }
    //update user details
    await customerDetails.findByIdAndUpdate(data._id, data);
    //update all collections
    if (oldUser.Name !== data.Name) {
      //update customerBalance
      await customerBalance.updateMany(
        { Name: oldUser.Name },
        { $set: { Name: data.Name } }
      );
      //update customerSales
      await customerSales.updateMany(
        { Name: oldUser.Name },
        { $set: { Name: data.Name } }
      );
      await customerCash.updateMany(
        { Name: oldUser.Name },
        { $set: { Name: data.Name } }
      );
    }

    res.send("User updated successfully");
  } catch (error) {
    // console.log(error);
    next(createError.Unauthorized(error));
  }
});

/**
 * @swagger
 * /auth/deleteCustomerDetails:
 *   delete:
 *     summary: Delete customer details
 *     description: Deletes a customer and all related data (balance, sales, cash).
 *     tags:
 *       - Customers Info
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Name:
 *                 type: string
 *                 description: The name of the customer to delete.
 *                 example: K K
 *     responses:
 *       200:
 *         description: Customer details deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: success
 *       400:
 *         description: Invalid request body.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Customer not found.
 */
router.delete("/deleteCustomerDetails", async (req, res, next) => {
  try {
    if (!req.body||!req.body.Name) {
      throw createError.Unauthorized("Missing request body");
    }
    const Name = req.body.Name;
    // delete user
    //check if user exists with that Name
    const data = await customerDetails.find({ Name: Name });
    if (!data[0]) {
      // console.log('Customer not found')
      throw createError.Unauthorized("Customer not found");
    }
    await customerDetails.deleteMany({ Name: Name });
    await customerBalance.deleteMany({ Name: Name });
    await customerSales.deleteMany({ Name: Name });
    await customerCash.deleteMany({ Name: Name });

    res.send("success");
  } catch (error) {
    console.log(error);
    next(createError.Unauthorized(error));
  }
});

//Customer Balance Report

/**
 * @swagger
 * /auth/customerBalanceReport:
 *   get:
 *     summary: Get customer balance report
 *     description: Retrieves a list of customer balances.
 *     tags:
 *       - Customer Balance
 *     responses:
 *       200:
 *         description: A list of customer balances.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   Name:
 *                     type: string
 *                     description: The name of the customer.
 *                   Balance:
 *                     type: number
 *                     description: The current balance of the customer.
 *       401:
 *         description: Unauthorized
 */

router.get("/customerBalanceReport", async (req, res, next) => {
  try {
    const customerBalanceList = await customerBalance.find(
      {},
      { _id: 0, __v: 0 }
    );

    if(customerBalanceList.length<1){
      // console.log('Hii')
       return next(createError.ServiceUnavailable('No data available'))
    }
    res.send(customerBalanceList);
  } catch (error) {
    // console.log(error);
    next(createError.Unauthorized('Fetching customer balance failed'));
  }
});

module.exports = router;
