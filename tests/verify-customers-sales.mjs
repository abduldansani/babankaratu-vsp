import assert from "node:assert/strict";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "../src/lib/validations/customer.ts";
import {
  createProductSaleSchema,
  saleItemInputSchema,
  cancelSaleSchema,
} from "../src/lib/validations/sale.ts";
import {
  recordCustomerPaymentSchema,
  reverseCustomerPaymentSchema,
} from "../src/lib/validations/customerPayment.ts";

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

async function runUnitTests() {
  console.log("\n=======================================================");
  console.log("RUNNING CUSTOMER & PRODUCT SALES UNIT TESTS");
  console.log("=======================================================\n");

  const validCustomerId = "507f1f77bcf86cd799439011";
  const validProductId1 = "507f1f77bcf86cd799439012";
  const validProductId2 = "507f1f77bcf86cd799439013";
  const validSaleId = "507f1f77bcf86cd799439014";

  // --- 1. Customer Validations ---
  console.log("--- 1. Customer Validation Rules ---");

  test("Valid customer data passes validation", () => {
    const res = createCustomerSchema.parse({
      name: "Alhaji Musa Danladi",
      phone: "08031234567",
      email: "musa@danladi.ng",
      address: "Shop 14, Wunti Market, Bauchi",
      notes: "Commercial fleet owner (3 Hiace buses)",
    });
    assert.equal(res.name, "Alhaji Musa Danladi");
    assert.equal(res.phone, "08031234567");
    assert.equal(res.isActive, true);
  });

  test("Customer name is required and rejects empty strings", () => {
    assert.throws(
      () =>
        createCustomerSchema.parse({
          name: "   ",
          phone: "08012345678",
        }),
      /Customer name is required/
    );
  });

  test("Invalid email format is rejected", () => {
    assert.throws(
      () =>
        createCustomerSchema.parse({
          name: "Usman Bello",
          email: "not-a-real-email",
        }),
      /Invalid email address/
    );
  });

  test("Optional fields can be empty strings", () => {
    const res = createCustomerSchema.parse({
      name: "Sani Garba",
      phone: "",
      email: "",
      address: "",
      notes: "",
    });
    assert.equal(res.name, "Sani Garba");
  });

  // --- 2. Sale Items & Product Sale Validations ---
  console.log("\n--- 2. Product Sale & Inventory Validation Rules ---");

  test("Valid sale item with positive quantity and unit price passes", () => {
    const item = saleItemInputSchema.parse({
      product: validProductId1,
      quantity: 4,
      unitPrice: 12500,
    });
    assert.equal(item.quantity, 4);
    assert.equal(item.unitPrice, 12500);
  });

  test("Sale item rejects zero or negative quantity", () => {
    assert.throws(
      () =>
        saleItemInputSchema.parse({
          product: validProductId1,
          quantity: 0,
          unitPrice: 5000,
        }),
      /Quantity must be at least 1/
    );

    assert.throws(
      () =>
        saleItemInputSchema.parse({
          product: validProductId1,
          quantity: -2,
          unitPrice: 5000,
        }),
      /Quantity must be at least 1/
    );
  });

  test("Sale item rejects fractional quantities", () => {
    assert.throws(
      () =>
        saleItemInputSchema.parse({
          product: validProductId1,
          quantity: 2.5,
          unitPrice: 5000,
        }),
      /whole number/
    );
  });

  test("Sale item rejects negative unit price", () => {
    assert.throws(
      () =>
        saleItemInputSchema.parse({
          product: validProductId1,
          quantity: 1,
          unitPrice: -500,
        }),
      /Unit price cannot be negative/
    );
  });

  test("Sale item rejects non-ObjectId product identifier", () => {
    assert.throws(
      () =>
        saleItemInputSchema.parse({
          product: "invalid-id-123",
          quantity: 1,
          unitPrice: 5000,
        }),
      /Invalid product ID/
    );
  });

  test("Registered customer sale with multiple items passes validation", () => {
    const sale = createProductSaleSchema.parse({
      customerId: validCustomerId,
      isWalkIn: false,
      items: [
        { product: validProductId1, quantity: 2, unitPrice: 7500 },
        { product: validProductId2, quantity: 1, unitPrice: 15000 },
      ],
      discount: 1000,
      initialPayment: 15000,
      paymentMethod: "bank_transfer",
      paymentReference: "TRF-987654",
    });
    assert.equal(sale.customerId, validCustomerId);
    assert.equal(sale.items.length, 2);
    assert.equal(sale.discount, 1000);
    assert.equal(sale.initialPayment, 15000);
  });

  test("Walk-in counter sale without customerId passes validation", () => {
    const sale = createProductSaleSchema.parse({
      isWalkIn: true,
      customerName: "Anonymous Driver",
      items: [{ product: validProductId1, quantity: 1, unitPrice: 5000 }],
      initialPayment: 5000,
    });
    assert.equal(sale.isWalkIn, true);
    assert.equal(sale.customerName, "Anonymous Driver");
  });

  test("Non-walk-in sale without customerId is rejected", () => {
    assert.throws(
      () =>
        createProductSaleSchema.parse({
          isWalkIn: false,
          customerId: "",
          items: [{ product: validProductId1, quantity: 1, unitPrice: 5000 }],
        }),
      /Customer is required for credit or non-walk-in sales/
    );
  });

  test("Sale must contain at least one item", () => {
    assert.throws(
      () =>
        createProductSaleSchema.parse({
          isWalkIn: true,
          items: [],
        }),
      /Sale must include at least one product/
    );
  });

  // --- 3. Customer Repayment Validations ---
  console.log("\n--- 3. Customer Repayment Validation Rules ---");

  test("Valid customer payment passes validation", () => {
    const pay = recordCustomerPaymentSchema.parse({
      customerId: validCustomerId,
      saleId: validSaleId,
      amount: 14000,
      paymentMethod: "pos",
      reference: "POS-BAU-0012",
      notes: "Part settlement for brake pads",
    });
    assert.equal(pay.customerId, validCustomerId);
    assert.equal(pay.saleId, validSaleId);
    assert.equal(pay.amount, 14000);
    assert.equal(pay.paymentMethod, "pos");
  });

  test("Customer payment rejects non-positive amount", () => {
    assert.throws(
      () =>
        recordCustomerPaymentSchema.parse({
          customerId: validCustomerId,
          amount: 0,
        }),
      /greater than zero/
    );

    assert.throws(
      () =>
        recordCustomerPaymentSchema.parse({
          customerId: validCustomerId,
          amount: -5000,
        }),
      /greater than zero/
    );
  });

  test("Customer payment reversal accepts valid reason", () => {
    const rev = reverseCustomerPaymentSchema.parse({
      reason: "Bounced cheque from customer bank",
    });
    assert.equal(rev.reason, "Bounced cheque from customer bank");
  });

  // --- 4. Mathematical Accounting Invariants ---
  console.log("\n--- 4. Mathematical Accounting Invariant Rules ---");

  test("Line totals and subtotal calculate accurately without floating point creep", () => {
    const items = [
      { qty: 3, price: 4250.5 },
      { qty: 7, price: 1199.99 },
    ];
    const lineTotals = items.map(
      (it) => Math.round(it.qty * it.price * 100) / 100
    );
    assert.equal(lineTotals[0], 12751.5);
    assert.equal(lineTotals[1], 8399.93);

    const subtotal = Math.round(lineTotals.reduce((a, b) => a + b, 0) * 100) / 100;
    assert.equal(subtotal, 21151.43);

    const discount = 500;
    const netTotal = Math.round((subtotal - discount) * 100) / 100;
    assert.equal(netTotal, 20651.43);

    const initialPaid = 10000;
    const debtBalance = Math.round((netTotal - initialPaid) * 100) / 100;
    assert.equal(debtBalance, 10651.43);
  });

  console.log("\n=======================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runUnitTests();
