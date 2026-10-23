import assert from "node:assert/strict";
import { calculateWeightedAverageCost } from "../src/lib/calculations/costing.ts";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "../src/lib/validations/supplier.ts";
import {
  createPurchaseSchema,
  updateDraftPurchaseSchema,
  postPurchaseSchema,
  cancelPurchaseSchema,
} from "../src/lib/validations/purchase.ts";
import {
  recordSupplierPaymentSchema,
  reverseSupplierPaymentSchema,
} from "../src/lib/validations/supplierPayment.ts";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("RUNNING SUPPLIER & PURCHASE MANAGEMENT UNIT TESTS");
  console.log("=======================================================\n");

  const validSupplierId = "507f1f77bcf86cd799439011";
  const validProductId = "507f1f77bcf86cd799439012";
  const validPurchaseId = "507f1f77bcf86cd799439013";

  // --- 1. Weighted Average Cost Calculations ---
  console.log("--- 1. Weighted Average Cost Calculation Rules ---");

  test("Weighted Average Cost with initial stock = 0 uses incoming cost", () => {
    // Current: 0 units at ₦0. Incoming: 10 units at ₦5,000
    const res = calculateWeightedAverageCost(0, 0, 10, 5000);
    assert.equal(res.newAverageCost, 5000);
    assert.equal(res.newStock, 10);
  });

  test("Weighted Average Cost calculates correctly with existing inventory", () => {
    // Existing: 10 units @ ₦5,000 = ₦50,000
    // Incoming: 10 units @ ₦7,000 = ₦70,000
    // Total Value: ₦120,000 / 20 units = ₦6,000
    const res = calculateWeightedAverageCost(10, 5000, 10, 7000);
    assert.equal(res.newAverageCost, 6000);
    assert.equal(res.newStock, 20);
  });

  test("Weighted Average Cost calculation preserves decimal precision", () => {
    // Existing: 7 units @ ₦1,250.50 = ₦8,753.50
    // Incoming: 13 units @ ₦1,420.25 = ₦18,463.25
    // Total Value = ₦27,216.75 / 20 units = ₦1,360.8375 -> rounded to 1360.84
    const res = calculateWeightedAverageCost(7, 1250.5, 13, 1420.25);
    assert.equal(res.newAverageCost, 1360.84);
    assert.equal(res.newStock, 20);
  });

  test("Weighted Average Cost ignores incoming quantity <= 0", () => {
    const res = calculateWeightedAverageCost(10, 5000, 0, 8000);
    assert.equal(res.newAverageCost, 5000);
    assert.equal(res.newStock, 10);
  });

  test("Weighted Average Cost rejects negative costs or quantities gracefully", () => {
    const res = calculateWeightedAverageCost(-5, 5000, 10, 6000);
    assert.equal(res.newAverageCost, 6000);
    assert.equal(res.newStock, 10);
  });

  // --- 2. Supplier Validation Schemas ---
  console.log("\n--- 2. Supplier Validation Schemas ---");

  test("Supplier requires non-empty name", () => {
    assert.throws(() => createSupplierSchema.parse({ name: "" }));
    assert.throws(() => createSupplierSchema.parse({ name: "   " }));
    const parsed = createSupplierSchema.parse({ name: "  Dan-Alhaji Auto  " });
    assert.equal(parsed.name, "Dan-Alhaji Auto");
  });

  test("Supplier allows optional phone, email, contact person, and address", () => {
    const parsed = createSupplierSchema.parse({
      name: "Kano Parts Importers",
      phone: "08031234567",
      email: "kano@parts.ng",
      contactPerson: "Alhaji Sani",
      address: "Shop 12, Kofar Ruwa Market",
      notes: "First Bank: 3012345678",
    });
    assert.equal(parsed.name, "Kano Parts Importers");
    assert.equal(parsed.phone, "08031234567");
    assert.equal(parsed.email, "kano@parts.ng");
    assert.equal(parsed.isActive, true);
  });

  test("Supplier allows empty string for phone or email without failing email regex", () => {
    const parsed = createSupplierSchema.parse({
      name: "Local Scrap Source",
      phone: "",
      email: "",
    });
    assert.equal(parsed.name, "Local Scrap Source");
  });

  // --- 3. Purchase Validation Schemas ---
  console.log("\n--- 3. Purchase Validation Schemas ---");

  test("Purchase requires valid supplierId and at least one item", () => {
    assert.throws(() =>
      createPurchaseSchema.parse({
        supplierId: "invalid-id",
        items: [{ product: validProductId, quantity: 1, unitCost: 100 }],
      })
    );

    assert.throws(() =>
      createPurchaseSchema.parse({
        supplierId: validSupplierId,
        items: [],
      })
    );
  });

  test("Purchase items require integer quantity >= 1 and non-negative unit cost", () => {
    assert.throws(() =>
      createPurchaseSchema.parse({
        supplierId: validSupplierId,
        items: [{ product: validProductId, quantity: 0, unitCost: 500 }],
      })
    );

    assert.throws(() =>
      createPurchaseSchema.parse({
        supplierId: validSupplierId,
        items: [{ product: validProductId, quantity: -2, unitCost: 500 }],
      })
    );

    assert.throws(() =>
      createPurchaseSchema.parse({
        supplierId: validSupplierId,
        items: [{ product: validProductId, quantity: 2, unitCost: -50 }],
      })
    );
  });

  test("Purchase defaults to draft status with 0 transport and cash payment method", () => {
    const parsed = createPurchaseSchema.parse({
      supplierId: validSupplierId,
      items: [{ product: validProductId, quantity: 5, unitCost: 1200 }],
    });
    assert.equal(parsed.status, "draft");
    assert.equal(parsed.transport, 0);
    assert.equal(parsed.initialPayment, 0);
    assert.equal(parsed.paymentMethod, "cash");
  });

  test("Purchase accepts posted status with initial payment and logistics fee", () => {
    const parsed = createPurchaseSchema.parse({
      supplierId: validSupplierId,
      items: [
        { product: validProductId, quantity: 10, unitCost: 3500 },
        { product: "507f1f77bcf86cd799439014", quantity: 2, unitCost: 15000 },
      ],
      transport: 2500,
      status: "posted",
      initialPayment: 20000,
      paymentMethod: "bank_transfer",
      paymentReference: "TRF-90238472",
      notes: "Delivered via express truck",
    });

    assert.equal(parsed.status, "posted");
    assert.equal(parsed.transport, 2500);
    assert.equal(parsed.initialPayment, 20000);
    assert.equal(parsed.paymentMethod, "bank_transfer");
    assert.equal(parsed.items.length, 2);
  });

  // --- 4. Supplier Payment Validation Schemas ---
  console.log("\n--- 4. Supplier Payment Validation Schemas ---");

  test("Payment requires valid supplierId and amount > 0", () => {
    assert.throws(() =>
      recordSupplierPaymentSchema.parse({
        supplierId: validSupplierId,
        amount: 0,
        paymentMethod: "cash",
      })
    );

    assert.throws(() =>
      recordSupplierPaymentSchema.parse({
        supplierId: validSupplierId,
        amount: -500,
        paymentMethod: "cash",
      })
    );

    const validPayment = recordSupplierPaymentSchema.parse({
      supplierId: validSupplierId,
      purchaseId: validPurchaseId,
      amount: 15000,
      paymentMethod: "bank_transfer",
      reference: "TRF-00123",
      notes: "Part settlement",
    });
    assert.equal(validPayment.amount, 15000);
    assert.equal(validPayment.paymentMethod, "bank_transfer");
  });

  test("Reverse payment schema validates optional reason up to 500 chars", () => {
    assert.throws(() =>
      reverseSupplierPaymentSchema.parse({
        reason: "a".repeat(501),
      })
    );

    const parsedWithReason = reverseSupplierPaymentSchema.parse({
      reason: "Cheque bounced at bank",
    });
    assert.equal(parsedWithReason.reason, "Cheque bounced at bank");

    const parsedEmpty = reverseSupplierPaymentSchema.parse({});
    assert.equal(parsedEmpty.reason, undefined);
  });

  // --- Summary ---
  console.log("\n=======================================================");
  console.log(`TEST SUITE FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
