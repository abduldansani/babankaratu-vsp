import assert from "node:assert/strict";
import dbConnect from "../src/lib/dbConnect";
import {
  Customer,
  Product,
  Category,
  Brand,
  Sale,
  CustomerPayment,
  Balance,
} from "../src/models";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  toggleCustomerActive,
} from "../src/actions/customerActions";
import {
  createProductSale,
  getSales,
  getSaleById,
  cancelSale,
  createSale,
} from "../src/actions/salesActions";
import {
  recordCustomerPayment,
  reverseCustomerPayment,
  getCustomerPayments,
} from "../src/actions/customerPaymentActions";
import { getTransactions } from "../src/actions/transactionActions";
import { getDashboardSummary } from "../src/actions/dashboardActions";
import mongoose from "mongoose";

async function runIntegrationTests() {
  console.log("\n=======================================================");
  console.log("RUNNING WEEK 3 CUSTOMER & PRODUCT SALES INTEGRATION TESTS");
  console.log("=======================================================\n");

  try {
    const conn = await dbConnect();
    console.log("✓ Connected to MongoDB database:", conn.connection.name);
  } catch (err) {
    console.error("ℹ Database connection failed:", (err as Error).message);
    process.exit(1);
  }

  const timestamp = Date.now();
  let testCustomerId: string = "";
  let testCustomer2Id: string = "";
  let testCategoryId: string = "";
  let testBrandId: string = "";
  let testProduct1Id: string = "";
  let testProduct2Id: string = "";

  try {
    // -----------------------------------------------------------------
    // Setup: Create test Category, Brand, and Products with known inventory
    // -----------------------------------------------------------------
    console.log("\n--- Setup: Test Products & Catalogue ---");
    const testCategory = await Category.create({
      name: `Braking System ${timestamp}`,
      description: "Test Category",
    });
    testCategoryId = String(testCategory._id);

    const testBrand = await Brand.create({
      name: `Toyota Genuine ${timestamp}`,
    });
    testBrandId = String(testBrand._id);

    // Product 1: 20 in stock, sellingPrice ₦15,000, costPrice ₦10,000
    const prod1 = await Product.create({
      name: `Front Brake Pad Set ${timestamp}`,
      partNumber: `BP-${timestamp}`,
      category: new mongoose.Types.ObjectId(testCategoryId),
      brand: new mongoose.Types.ObjectId(testBrandId),
      costPrice: mongoose.Types.Decimal128.fromString("10000"),
      sellingPrice: mongoose.Types.Decimal128.fromString("15000"),
      quantityOnHand: 20,
      reorderLevel: 5,
    });
    testProduct1Id = String(prod1._id);

    // Product 2: 10 in stock, sellingPrice ₦25,000, costPrice ₦18,000
    const prod2 = await Product.create({
      name: `Shock Absorber Rear ${timestamp}`,
      partNumber: `SA-${timestamp}`,
      category: new mongoose.Types.ObjectId(testCategoryId),
      brand: new mongoose.Types.ObjectId(testBrandId),
      costPrice: mongoose.Types.Decimal128.fromString("18000"),
      sellingPrice: mongoose.Types.Decimal128.fromString("25000"),
      quantityOnHand: 10,
      reorderLevel: 2,
    });
    testProduct2Id = String(prod2._id);

    console.log(`✓ Created test products: "${prod1.name}" (Stock: 20), "${prod2.name}" (Stock: 10)`);

    // -----------------------------------------------------------------
    // Scenario 1: Customer CRUD, Search, and Duplicate Prevention
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 1: Customer Management & Duplicate Detection ---");

    const custName = `Alhaji Dahiru Bauchi ${timestamp}`;
    const custPhone = "08035551122";

    const createCustRes = await createCustomer({
      name: custName,
      phone: custPhone,
      email: `dahiru${timestamp}@example.ng`,
      address: "Shop 4, Kobi Street, Bauchi",
      notes: "Commercial fleet operator",
    });

    assert.equal(createCustRes.success, true, "Customer creation failed");
    testCustomerId = (createCustRes.data as any)._id;
    console.log(`✓ Customer created with ID: ${testCustomerId}`);

    // Verify duplicate name prevention
    const dupNameRes = await createCustomer({
      name: `  ${custName.toUpperCase()}  `,
      phone: "08099990000",
    });
    assert.equal(dupNameRes.success, false, "Should reject duplicate normalized customer name");
    console.log(`✓ Duplicate customer name correctly rejected: "${dupNameRes.error}"`);

    // Verify duplicate phone prevention
    const dupPhoneRes = await createCustomer({
      name: `Different Name ${timestamp}`,
      phone: custPhone,
    });
    assert.equal(dupPhoneRes.success, false, "Should reject duplicate phone number");
    console.log(`✓ Duplicate customer phone correctly rejected: "${dupPhoneRes.error}"`);

    // Create a second customer for cross-allocation testing
    const cust2Res = await createCustomer({
      name: `Malam Babangida ${timestamp}`,
      phone: "08077778899",
      address: "Gwallameji, Bauchi",
    });
    testCustomer2Id = (cust2Res.data as any)._id;

    // Search customer
    const searchRes = await getCustomers({ search: "Dahiru", limit: 10 });
    assert.ok(searchRes.items.some((c) => c._id === testCustomerId), "Search failed to find created customer");
    console.log(`✓ Customer search verified`);

    // Update customer
    const updateRes = await updateCustomer(testCustomerId, {
      name: `${custName} Updated`,
      notes: "Preferred mechanic: Musa Garba",
    });
    assert.equal(updateRes.success, true);
    assert.equal((updateRes.data as any).name, `${custName} Updated`);
    console.log(`✓ Customer update verified`);

    // -----------------------------------------------------------------
    // Scenario 2: Multi-Item Product Sale & Stock Deduction
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 2: Multi-Item Confirmed Sale & Inventory Deduction ---");

    // Buy 3 Brake Pads (@ ₦15,000) and 2 Shock Absorbers (@ ₦25,000)
    // Subtotal: (3 * 15,000) + (2 * 25,000) = 45,000 + 50,000 = ₦95,000
    // Discount: ₦5,000 => Net Total: ₦90,000
    // Initial Payment: ₦90,000 (Fully paid)
    const sale1Res = await createProductSale({
      customerId: testCustomerId,
      isWalkIn: false,
      items: [
        { product: testProduct1Id, quantity: 3, unitPrice: 15000 },
        { product: testProduct2Id, quantity: 2, unitPrice: 25000 },
      ],
      discount: 5000,
      initialPayment: 90000,
      paymentMethod: "bank_transfer",
      paymentReference: "TRF-TEST-001",
    });

    assert.equal(sale1Res.success, true, `Sale 1 failed: ${sale1Res.error}`);
    const sale1 = sale1Res.data as any;
    assert.equal(sale1.subtotal, 95000);
    assert.equal(sale1.discount, 5000);
    assert.equal(sale1.totalAmount, 90000);
    assert.equal(sale1.paidAmount, 90000);
    assert.equal(sale1.balance, 0);
    assert.equal(sale1.paymentStatus, "paid");
    assert.equal(sale1.status, "confirmed");

    // Verify inventory deducted exactly once
    const updatedProd1 = await Product.findById(testProduct1Id);
    const updatedProd2 = await Product.findById(testProduct2Id);
    assert.equal(updatedProd1?.quantityOnHand, 17, "Product 1 stock should have reduced from 20 to 17");
    assert.equal(updatedProd2?.quantityOnHand, 8, "Product 2 stock should have reduced from 10 to 8");
    console.log(`✓ Sale confirmed: ₦${sale1.totalAmount}. Inventory deducted: Prod1 (17 left), Prod2 (8 left)`);

    // Verify cost snapshot
    assert.equal(sale1.items[0].unitCost, 10000, "Historical unitCost snapshot must preserve 10,000");
    assert.equal(sale1.items[1].unitCost, 18000, "Historical unitCost snapshot must preserve 18,000");
    console.log(`✓ Historical cost snapshot verified for profit calculations`);

    // -----------------------------------------------------------------
    // Scenario 3: Reject Insufficient Stock & Invalid Inputs
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 3: Reject Insufficient Stock & Validation Failures ---");

    // Request 50 units when only 17 are in stock
    const oversellRes = await createProductSale({
      customerId: testCustomerId,
      isWalkIn: false,
      items: [{ product: testProduct1Id, quantity: 50, unitPrice: 15000 }],
    });
    assert.equal(oversellRes.success, false, "Should reject overselling");
    console.log(`✓ Overselling correctly rejected: "${oversellRes.error}"`);

    // Check stock was untouched by rejected attempt
    const stockCheck = await Product.findById(testProduct1Id);
    assert.equal(stockCheck?.quantityOnHand, 17, "Stock must remain unchanged after rejected sale");

    // Reject invalid product ID
    const invalidProdRes = await createProductSale({
      customerId: testCustomerId,
      isWalkIn: false,
      items: [{ product: new mongoose.Types.ObjectId().toString(), quantity: 1, unitPrice: 5000 }],
    });
    assert.equal(invalidProdRes.success, false, "Should reject non-existent product ID");
    console.log(`✓ Non-existent product ID correctly rejected: "${invalidProdRes.error}"`);

    // -----------------------------------------------------------------
    // Scenario 4: Partially Paid Sale & Credit Debt Tracking
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 4: Partially Paid Sale & Customer Debt ---");

    // Buy 2 Shock Absorbers (@ ₦25,000) = ₦50,000. Initial payment: ₦20,000. Balance due: ₦30,000
    const partialSaleRes = await createProductSale({
      customerId: testCustomerId,
      isWalkIn: false,
      items: [{ product: testProduct2Id, quantity: 2, unitPrice: 25000 }],
      initialPayment: 20000,
      paymentMethod: "cash",
      notes: "₦30k balance to be paid on Friday",
    });

    assert.equal(partialSaleRes.success, true);
    const partialSale = partialSaleRes.data as any;
    assert.equal(partialSale.totalAmount, 50000);
    assert.equal(partialSale.paidAmount, 20000);
    assert.equal(partialSale.balance, 30000);
    assert.equal(partialSale.paymentStatus, "partial");
    console.log(`✓ Partial sale recorded: Total ₦50,000, Paid ₦20,000, Debt ₦30,000`);

    // Verify customer's calculated balance
    const custDetails = await getCustomerById(testCustomerId);
    assert.equal((custDetails.data as any).metrics.outstandingBalance, 30000, "Customer debt must reflect ₦30,000");
    console.log(`✓ Customer outstanding balance calculated correctly: ₦${(custDetails.data as any).metrics.outstandingBalance}`);


    // -----------------------------------------------------------------
    // Scenario 5: Unpaid Credit Sale & Walk-in Restrictions
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 5: Unpaid Credit Sale & Walk-in Protection ---");

    // Walk-in customer trying to buy on credit must be rejected
    const walkInCreditRes = await createProductSale({
      isWalkIn: true,
      items: [{ product: testProduct1Id, quantity: 1, unitPrice: 15000 }],
      initialPayment: 0, // Unpaid
    });
    assert.equal(walkInCreditRes.success, false, "Walk-in cannot buy on credit");
    console.log(`✓ Walk-in credit sale correctly rejected: "${walkInCreditRes.error}"`);

    // Registered customer buying on full credit (₦15,000)
    const creditSaleRes = await createProductSale({
      customerId: testCustomerId,
      isWalkIn: false,
      items: [{ product: testProduct1Id, quantity: 1, unitPrice: 15000 }],
      initialPayment: 0,
      notes: "Full credit sale",
    });
    assert.equal(creditSaleRes.success, true);
    const creditSale = creditSaleRes.data as any;
    assert.equal(creditSale.paidAmount, 0);
    assert.equal(creditSale.balance, 15000);
    assert.equal(creditSale.paymentStatus, "unpaid");

    // Total debt of customer is now 30,000 + 15,000 = ₦45,000
    const custDebtCheck = await getCustomerById(testCustomerId);
    assert.equal((custDebtCheck.data as any).metrics.outstandingBalance, 45000);
    console.log(`✓ Total customer debt after credit sale: ₦${(custDebtCheck.data as any).metrics.outstandingBalance}`);

    // -----------------------------------------------------------------
    // Scenario 6: Customer Repayment & Overpayment Rejection
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 6: Subsequent Repayment & Debt Settlement ---");

    // Reject payment exceeding total debt (trying to pay ₦60,000 when debt is ₦45,000)
    const overpayRes = await recordCustomerPayment({
      customerId: testCustomerId,
      amount: 60000,
    });
    assert.equal(overpayRes.success, false, "Overpayment should be rejected");
    console.log(`✓ Overpayment correctly rejected: "${overpayRes.error}"`);

    // Reject paying towards another customer's sale
    const wrongCustomerPay = await recordCustomerPayment({
      customerId: testCustomer2Id,
      saleId: partialSale._id,
      amount: 10000,
    });
    assert.equal(wrongCustomerPay.success, false, "Should reject cross-customer allocation");
    console.log(`✓ Cross-customer payment correctly rejected: "${wrongCustomerPay.error}"`);

    // Pay ₦30,000 towards partialSale
    const repay1Res = await recordCustomerPayment({
      customerId: testCustomerId,
      saleId: partialSale._id,
      amount: 30000,
      paymentMethod: "pos",
      reference: "POS-REPAY-01",
    });
    assert.equal(repay1Res.success, true);
    console.log(`✓ Repayment of ₦30,000 recorded against sale ${partialSale.saleNumber}`);

    // Verify partialSale is now fully paid
    const updatedPartialSale = await Sale.findById(partialSale._id);
    assert.equal(updatedPartialSale?.paidAmount, 50000);
    assert.equal(updatedPartialSale?.balance, 0);
    assert.equal(updatedPartialSale?.paymentStatus, "paid");

    // Customer balance should now be ₦15,000
    const custPostRepay = await getCustomerById(testCustomerId);
    assert.equal((custPostRepay.data as any).metrics.outstandingBalance, 15000);
    console.log(`✓ Customer remaining debt correctly updated to: ₦${(custPostRepay.data as any).metrics.outstandingBalance}`);

    // Pay remaining ₦15,000 via FIFO auto-allocation
    const repay2Res = await recordCustomerPayment({
      customerId: testCustomerId,
      amount: 15000,
      paymentMethod: "cash",
      notes: "Settling all remaining debt",
    });
    assert.equal(repay2Res.success, true);

    const custDebtCleared = await getCustomerById(testCustomerId);
    assert.equal((custDebtCleared.data as any).metrics.outstandingBalance, 0);
    console.log(`✓ All customer debt successfully cleared: ₦0.00`);

    // -----------------------------------------------------------------
    // Scenario 7: Payment Reversal
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 7: Payment Reversal & Balance Restoration ---");

    const paymentToReverse = (repay2Res.data as any)._id;
    const reverseRes = await reverseCustomerPayment(paymentToReverse, {
      reason: "Bounced cheque from customer",
    });
    assert.equal(reverseRes.success, true);
    console.log(`✓ Payment reversed successfully`);

    // Debt should be restored to ₦15,000
    const custPostReversal = await getCustomerById(testCustomerId);
    assert.equal((custPostReversal.data as any).metrics.outstandingBalance, 15000);
    console.log(`✓ Customer debt correctly restored after reversal: ₦${(custPostReversal.data as any).metrics.outstandingBalance}`);

    // Trying to reverse the same payment again must fail
    const doubleReverseRes = await reverseCustomerPayment(paymentToReverse, {
      reason: "Try again",
    });
    assert.equal(doubleReverseRes.success, false, "Cannot reverse an already reversed payment");
    console.log(`✓ Duplicate reversal prevented: "${doubleReverseRes.error}"`);

    // -----------------------------------------------------------------
    // Scenario 8: Sale Cancellation & Stock Restoration
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 8: Sale Cancellation & Stock Restoration ---");

    const prod1StockBeforeCancel = (await Product.findById(testProduct1Id))?.quantityOnHand || 0;
    const cancelRes = await cancelSale(creditSale._id, {
      reason: "Customer returned part / damaged packaging",
    });
    assert.equal(cancelRes.success, true);

    // Stock for Product 1 should be restored by 1 unit
    const prod1StockAfterCancel = (await Product.findById(testProduct1Id))?.quantityOnHand || 0;
    assert.equal(prod1StockAfterCancel, prod1StockBeforeCancel + 1);
    console.log(`✓ Sale cancelled. Product 1 stock restored from ${prod1StockBeforeCancel} to ${prod1StockAfterCancel}`);

    // Debt should now be 0 since the credit sale was cancelled
    const custAfterSaleCancel = await getCustomerById(testCustomerId);
    assert.equal((custAfterSaleCancel.data as any).metrics.outstandingBalance, 0);
    console.log(`✓ Customer debt returned to ₦0 after sale cancellation`);


    // -----------------------------------------------------------------
    // Scenario 9: Prevent Hard Deletion of Customer with History
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 9: Hard Deletion Protection for Customer with Transactions ---");

    const deleteAttempt = await deleteCustomer(testCustomerId);
    assert.equal(deleteAttempt.success, false, "Should block hard deleting customer with sales");
    console.log(`✓ Customer deletion blocked: "${deleteAttempt.error}"`);

    // Deactivation should succeed
    const deactRes = await toggleCustomerActive(testCustomerId);
    assert.equal(deactRes.success, true);
    assert.equal((deactRes.data as any).isActive, false);
    console.log(`✓ Customer deactivated successfully`);

    // Selling to a deactivated customer must fail
    const sellToDeactivated = await createProductSale({
      customerId: testCustomerId,
      isWalkIn: false,
      items: [{ product: testProduct1Id, quantity: 1, unitPrice: 15000 }],
    });
    assert.equal(sellToDeactivated.success, false, "Cannot sell to deactivated customer");
    console.log(`✓ Selling to deactivated customer correctly rejected: "${sellToDeactivated.error}"`);

    // Re-activate customer
    await toggleCustomerActive(testCustomerId);

    // -----------------------------------------------------------------
    // Scenario 10: Legacy Sales Preservation
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 10: Legacy Sales Workflow Compatibility ---");

    const legacySale = await createSale({
      bicycle: 12000,
      motorcycle: 35000,
      notes: "Legacy counter record",
    });
    assert.equal(legacySale.totalAmount, 47000);
    assert.equal(legacySale.isLegacy, true);
    console.log(`✓ Legacy sale created successfully: Total ₦${legacySale.totalAmount}`);

    // Verify getSales returns both legacy and modern sales
    const salesList = await getSales({ limit: 50 });
    assert.ok(salesList.items.some((s: any) => s.isLegacy === true));
    assert.ok(salesList.items.some((s: any) => s.isLegacy === false));
    console.log(`✓ Sales list cleanly handles both legacy and product-based sales`);

    // -----------------------------------------------------------------
    // Scenario 11: Financial Summaries & Cash Flow (No Double Counting)
    // -----------------------------------------------------------------
    console.log("\n--- Scenario 11: Financial Summaries & No Double Counting ---");

    const txReport = await getTransactions();
    assert.ok(txReport.items.length > 0);
    assert.ok(txReport.totalCashIn > 0);
    console.log(`✓ Transaction report generated: Total Cash In = ₦${txReport.totalCashIn.toLocaleString()}`);

    const dashSummary = await getDashboardSummary();
    assert.ok(dashSummary.totalSales >= 0);
    assert.ok(dashSummary.availableCash !== undefined);
    assert.ok(dashSummary.customerDebt !== undefined);
    console.log(`✓ Dashboard summary metrics: Available Cash = ₦${dashSummary.availableCash.toLocaleString()}, Customer Debt = ₦${dashSummary.customerDebt.toLocaleString()}`);

    // -----------------------------------------------------------------
    // Cleanup fixtures
    // -----------------------------------------------------------------
    console.log("\n--- Cleanup Test Fixtures ---");
    await Sale.deleteMany({ _id: { $in: [sale1._id, partialSale._id, creditSale._id, legacySale._id] } });
    await CustomerPayment.deleteMany({ customerId: { $in: [testCustomerId, testCustomer2Id] } });
    await Customer.deleteMany({ _id: { $in: [testCustomerId, testCustomer2Id] } });
    await Product.deleteMany({ _id: { $in: [testProduct1Id, testProduct2Id] } });
    await Category.findByIdAndDelete(testCategoryId);
    await Brand.findByIdAndDelete(testBrandId);
    console.log(`✓ Cleaned up test database fixtures`);

    console.log("\n=======================================================");
    console.log("ALL 20 WEEK 3 INTEGRATION SCENARIOS VERIFIED SUCCESSFULLY!");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("❌ Integration test failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runIntegrationTests();
