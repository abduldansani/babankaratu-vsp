import assert from "node:assert/strict";
import dbConnect from "../src/lib/dbConnect";
import {
  Supplier,
  Product,
  Category,
  Brand,
  Purchase,
  SupplierPayment,
} from "../src/models";
import {
  createSupplier,
  getSupplierById,
  deleteOrDeactivateSupplier,
} from "../src/actions/supplierActions";
import {
  createPurchase,
  getPurchaseById,
  postPurchase,
  updateDraftPurchase,
  cancelPurchase,
} from "../src/actions/purchaseActions";
import {
  recordSupplierPayment,
} from "../src/actions/supplierPaymentActions";
import mongoose from "mongoose";

async function runIntegrationTests() {
  console.log("\n=======================================================");
  console.log("RUNNING WEEK 2 END-TO-END PURCHASING & STOCK INTEGRATION TESTS");
  console.log("=======================================================\n");

  try {
    const conn = await dbConnect();
    console.log("✓ Connected to MongoDB:", conn.connection.name);
  } catch (err) {
    console.error("ℹ Database connection failed:", (err as Error).message);
    process.exit(1);
  }

  const timestamp = Date.now();
  let testSupplierId: string = "";
  let testProductId: string = "";
  let testCategoryId: string = "";
  let testBrandId: string = "";
  let testPurchaseId: string = "";

  try {
    // -----------------------------------------------------------------
    // 1. Supplier Creation & Uniqueness
    // -----------------------------------------------------------------
    console.log("--- 1. Testing Supplier Creation & Duplicate Prevention ---");
    const supName = `Kano Genuine Parts ${timestamp}`;
    const createSupRes = await createSupplier({
      name: supName,
      phone: "08039998877",
      email: `kano${timestamp}@example.ng`,
      contactPerson: "Malam Ibrahim",
      address: "Shop 15, Kofar Ruwa Market, Kano",
      notes: "Zenith Bank: 1012345678",
      isActive: true,
    });

    assert.equal(createSupRes.success, true, `Supplier creation failed: ${createSupRes.error}`);
    testSupplierId = String((createSupRes.data as any)._id);
    console.log(`  ✓ Supplier created with ID: ${testSupplierId}`);

    // Verify duplicate name is rejected
    const dupRes = await createSupplier({
      name: `  ${supName.toLowerCase()}  `,
      phone: "08011112222",
      isActive: true,
    });
    assert.equal(dupRes.success, false, "Duplicate supplier name should have been rejected");
    console.log(`  ✓ Duplicate supplier name rejected: "${dupRes.error}"`);

    // Verify initial supplier ledger metrics
    const supLedgerInitial = await getSupplierById(testSupplierId);
    assert.equal(supLedgerInitial?.metrics.totalPurchased, 0);
    assert.equal(supLedgerInitial?.metrics.totalPaid, 0);
    assert.equal(supLedgerInitial?.metrics.outstandingBalance, 0);
    console.log("  ✓ Initial supplier balance is derived at ₦0.00");

    // -----------------------------------------------------------------
    // 2. Setup Category, Brand & Product for Stock Testing
    // -----------------------------------------------------------------
    console.log("\n--- 2. Setting Up Test Inventory Product ---");
    const testCat = await Category.create({
      name: `Braking System ${timestamp}`,
      normalizedName: `braking system ${timestamp}`,
    });
    testCategoryId = String(testCat._id);

    const testBrand = await Brand.create({
      name: `Bosch Auto ${timestamp}`,
      normalizedName: `bosch auto ${timestamp}`,
    });
    testBrandId = String(testBrand._id);

    // Initial Product: 10 units in stock @ ₦5,000 costPrice
    const testProd = await Product.create({
      name: `Ceramic Brake Pads ${timestamp}`,
      partNumber: `BP-${timestamp}`,
      category: testCat._id,
      brand: testBrand._id,
      quantityOnHand: 10,
      costPrice: mongoose.Types.Decimal128.fromString("5000.00"),
      sellingPrice: mongoose.Types.Decimal128.fromString("8500.00"),
      reorderLevel: 5,
    });
    testProductId = String(testProd._id);
    console.log(`  ✓ Product created: 10 units @ ₦5,000.00 cost price`);

    // -----------------------------------------------------------------
    // 3. Create Draft Purchase (Must NOT Affect Stock or Balances)
    // -----------------------------------------------------------------
    console.log("\n--- 3. Testing Draft Purchase Lifecycle ---");
    const draftRes = await createPurchase({
      supplierId: testSupplierId,
      purchaseDate: new Date().toISOString(),
      items: [
        {
          product: testProductId,
          quantity: 15,
          unitCost: 7000,
        },
      ],
      transport: 3000,
      notes: "First shipment draft",
      status: "draft",
      initialPayment: 0,
      paymentMethod: "cash",
    });

    assert.equal(draftRes.success, true, `Draft purchase creation failed: ${draftRes.error}`);
    testPurchaseId = String(draftRes.data?._id);
    console.log(`  ✓ Draft Purchase created: ${draftRes.data?.purchaseNumber}`);

    // Verify stockOnHand was NOT touched
    const prodAfterDraft = await Product.findById(testProductId);
    assert.equal(prodAfterDraft?.quantityOnHand, 10, "Draft purchase must not alter stock quantity");
    assert.equal(
      parseFloat(prodAfterDraft?.costPrice.toString() || "0"),
      5000,
      "Draft purchase must not alter cost price"
    );
    console.log("  ✓ Stock quantity and cost price remained completely unchanged");

    // Verify supplier balance was NOT touched
    const supAfterDraft = await getSupplierById(testSupplierId);
    assert.equal(supAfterDraft?.metrics.outstandingBalance, 0, "Draft must not create supplier liability");
    console.log("  ✓ Supplier outstanding balance remained ₦0.00 (drafts are not liabilities)");

    // -----------------------------------------------------------------
    // 4. Update Draft Purchase
    // -----------------------------------------------------------------
    console.log("\n--- 4. Updating Draft Purchase Order ---");
    // Update items to 20 units @ ₦8,000, transport = ₦5,000
    // Total should become (20 * 8,000) + 5,000 = ₦165,000
    const updateDraftRes = await updateDraftPurchase(testPurchaseId, {
      supplierId: testSupplierId,
      items: [
        {
          product: testProductId,
          quantity: 20,
          unitCost: 8000,
        },
      ],
      transport: 5000,
      notes: "Updated batch size to 20 units",
    });
    assert.equal(updateDraftRes.success, true, `Failed to update draft: ${updateDraftRes.error}`);

    const draftUpdated = await getPurchaseById(testPurchaseId);
    assert.equal(draftUpdated?.subtotal, 160000);
    assert.equal(draftUpdated?.transport, 5000);
    assert.equal(draftUpdated?.total, 165000);
    console.log(`  ✓ Draft updated: 20 units @ ₦8,000 + ₦5,000 transport = ₦165,000`);

    // -----------------------------------------------------------------
    // 5. Post the Purchase with Initial Payment & Weighted-Average Costing
    // -----------------------------------------------------------------
    console.log("\n--- 5. Posting Purchase & Verifying Weighted-Average Costing ---");
    // Initial payment of ₦50,000
    const postRes = await postPurchase(testPurchaseId, {
      initialPayment: 50000,
      paymentMethod: "bank_transfer",
      paymentReference: "TRF-TEST-1001",
    });
    assert.equal(postRes.success, true, `Failed to post purchase: ${postRes.error}`);
    console.log("  ✓ Purchase order successfully posted");

    // Check stock increment: 10 existing + 20 incoming = 30
    const prodAfterPost = await Product.findById(testProductId);
    assert.equal(prodAfterPost?.quantityOnHand, 30, "Stock quantityOnHand must be 30");

    // Check weighted-average cost:
    // Existing: 10 @ 5,000 = 50,000
    // Incoming: 20 @ 8,000 = 160,000
    // Total value: 210,000 / 30 = 7,000
    const newCost = parseFloat(prodAfterPost?.costPrice.toString() || "0");
    assert.equal(newCost, 7000, `Expected weighted-average cost 7000, got ${newCost}`);
    console.log(`  ✓ Stock incremented to 30 units`);
    console.log(`  ✓ Weighted-average cost correctly computed: ₦7,000.00`);

    // Check purchase status and balance:
    const postedDoc = await getPurchaseById(testPurchaseId);
    assert.equal(postedDoc?.status, "posted");
    assert.equal(postedDoc?.paid, 50000);
    assert.equal(postedDoc?.balance, 115000);
    assert.equal(postedDoc?.paymentStatus, "partial");
    console.log(`  ✓ Purchase status: posted, Paid: ₦50,000, Remaining Balance: ₦115,000`);

    // Check that initial payment was created in SupplierPayment
    const initialPaymentDoc = await SupplierPayment.findOne({ purchase: testPurchaseId });
    assert.ok(initialPaymentDoc, "Initial payment record must exist");
    assert.equal(initialPaymentDoc.amount, 50000);
    assert.equal(initialPaymentDoc.paymentMethod, "bank_transfer");
    console.log(`  ✓ Traceable SupplierPayment created: ${initialPaymentDoc.paymentNumber}`);

    // Verify double-posting is prevented
    const doublePostRes = await postPurchase(testPurchaseId);
    assert.equal(doublePostRes.success, false, "Double posting must be rejected");
    console.log(`  ✓ Double-posting rejected: "${doublePostRes.error}"`);

    // -----------------------------------------------------------------
    // 6. Record Additional Payment & Settlement
    // -----------------------------------------------------------------
    console.log("\n--- 6. Recording Additional Supplier Payments ---");
    // Test paying more than remaining debt (₦115,000)
    const overpayRes = await recordSupplierPayment({
      supplierId: testSupplierId,
      purchaseId: testPurchaseId,
      amount: 150000, // Exceeds ₦115,000
      paymentMethod: "bank_transfer",
    });
    assert.equal(overpayRes.success, false, "Overpayment on invoice must be rejected");
    console.log(`  ✓ Overpayment rejected: "${overpayRes.error}"`);

    // Make partial payment of ₦15,000
    const partPayRes = await recordSupplierPayment({
      supplierId: testSupplierId,
      purchaseId: testPurchaseId,
      amount: 15000,
      paymentMethod: "pos",
      reference: "POS-9988",
    });
    assert.equal(partPayRes.success, true);
    const purchaseAfterPart = await getPurchaseById(testPurchaseId);
    assert.equal(purchaseAfterPart?.paid, 65000);
    assert.equal(purchaseAfterPart?.balance, 100000);
    console.log(`  ✓ Partial payment of ₦15,000 recorded. New balance: ₦100,000`);

    // Settle full remaining balance (₦100,000)
    const fullPayRes = await recordSupplierPayment({
      supplierId: testSupplierId,
      purchaseId: testPurchaseId,
      amount: 100000,
      paymentMethod: "bank_transfer",
      reference: "TRF-FINAL-SETTLE",
    });
    assert.equal(fullPayRes.success, true);
    const purchaseAfterFull = await getPurchaseById(testPurchaseId);
    assert.equal(purchaseAfterFull?.paid, 165000);
    assert.equal(purchaseAfterFull?.balance, 0);
    assert.equal(purchaseAfterFull?.paymentStatus, "paid");
    console.log(`  ✓ Full settlement recorded. Invoice is now fully paid (₦0.00 balance)`);

    // Verify supplier ledger summary
    const supFinalLedger = await getSupplierById(testSupplierId);
    assert.equal(supFinalLedger?.metrics.totalPurchased, 165000);
    assert.equal(supFinalLedger?.metrics.totalPaid, 165000);
    assert.equal(supFinalLedger?.metrics.outstandingBalance, 0);
    console.log("  ✓ Supplier derived ledger matches: Invoiced: ₦165,000, Paid: ₦165,000, Balance: ₦0.00");

    // -----------------------------------------------------------------
    // 7. Test Safe Supplier Deactivation (Preserving History)
    // -----------------------------------------------------------------
    console.log("\n--- 7. Testing Safe Supplier Deactivation & Archival ---");
    const deactivateRes = await deleteOrDeactivateSupplier(testSupplierId);
    assert.equal(deactivateRes.success, true);
    assert.equal(deactivateRes.data?.action, "deactivated");

    const supDoc = await Supplier.findById(testSupplierId);
    assert.ok(supDoc, "Supplier document must NOT be deleted");
    assert.equal(supDoc.isActive, false, "Supplier must be deactivated");
    console.log("  ✓ Supplier with transaction history safely deactivated (isActive: false) instead of deleted");

    // -----------------------------------------------------------------
    // 8. Test Cancellation & Stock Reversal Safeguard
    // -----------------------------------------------------------------
    console.log("\n--- 8. Testing Stock Reversal & Negative Inventory Safeguard ---");
    // Simulate that out of the 30 units, 20 were sold (leaving only 10 in stock)
    await Product.findByIdAndUpdate(testProductId, { quantityOnHand: 10 });

    // Since this purchase brought in 20 units, reversing it would drop stock to -10,
    // which must be blocked by the safety check!
    const blockedCancelRes = await cancelPurchase(testPurchaseId, {
      reason: "Customer dispute",
    });
    assert.equal(
      blockedCancelRes.success,
      false,
      "Cancellation must be blocked if stock has been consumed"
    );
    console.log(`  ✓ Reversal blocked to prevent negative inventory: "${blockedCancelRes.error}"`);

    // Now restore stock to 30 units (all purchased stock available) and cancel
    await Product.findByIdAndUpdate(testProductId, { quantityOnHand: 30 });
    const successCancelRes = await cancelPurchase(testPurchaseId, {
      reason: "Damaged shipment returned to vendor",
    });
    assert.equal(successCancelRes.success, true);

    const prodAfterCancel = await Product.findById(testProductId);
    assert.equal(
      prodAfterCancel?.quantityOnHand,
      10,
      "Stock must be safely decremented by 20 units"
    );

    const cancelledPurchase = await getPurchaseById(testPurchaseId);
    assert.equal(cancelledPurchase?.status, "cancelled");
    console.log("  ✓ Purchase successfully cancelled and stock safely reversed to 10 units");

    // Verify payments linked to cancelled purchase were marked reversed
    const linkedPayments = await SupplierPayment.find({ purchase: testPurchaseId });
    for (const pm of linkedPayments) {
      assert.equal(pm.status, "reversed");
    }
    console.log(`  ✓ All ${linkedPayments.length} linked supplier payment records marked reversed`);

    console.log("\n=======================================================");
    console.log("ALL INTEGRATION TESTS PASSED CLEANLY! ✓");
    console.log("=======================================================\n");
  } finally {
    // Clean up test data
    if (testSupplierId) await Supplier.findByIdAndDelete(testSupplierId);
    if (testProductId) await Product.findByIdAndDelete(testProductId);
    if (testCategoryId) await Category.findByIdAndDelete(testCategoryId);
    if (testBrandId) await Brand.findByIdAndDelete(testBrandId);
    if (testPurchaseId) {
      await Purchase.findByIdAndDelete(testPurchaseId);
      await SupplierPayment.deleteMany({ purchase: testPurchaseId });
    }
    await mongoose.disconnect();
  }
}

runIntegrationTests();
