import assert from "node:assert/strict";
import {
  createVehicleMakeSchema,
  createVehicleModelSchema,
} from "../src/lib/validations/vehicle.ts";
import {
  createCategorySchema,
} from "../src/lib/validations/category.ts";
import {
  createProductAttributeSchema,
} from "../src/lib/validations/product-attribute.ts";
import {
  createBrandSchema,
} from "../src/lib/validations/brand.ts";
import {
  createProductSchema,
} from "../src/lib/validations/product.ts";

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
  console.log("RUNNING VEHICLE & PRODUCT MANAGEMENT TEST SUITE");
  console.log("=======================================================\n");

  const validId = "507f1f77bcf86cd799439011";
  const validId2 = "507f1f77bcf86cd799439012";

  console.log("--- 1. Vehicle Make & Model Validation ---");

  test("Vehicle Make requires non-empty name", () => {
    assert.throws(() => createVehicleMakeSchema.parse({ name: "" }));
    assert.throws(() => createVehicleMakeSchema.parse({ name: "   " }));
    const parsed = createVehicleMakeSchema.parse({ name: "  Bajaj  " });
    assert.equal(parsed.name, "Bajaj");
  });

  test("Vehicle Model requires valid Make ObjectId", () => {
    assert.throws(() =>
      createVehicleModelSchema.parse({ name: "Boxer BM150", make: "invalid-id" })
    );
    const parsed = createVehicleModelSchema.parse({
      name: "Boxer BM150",
      make: validId,
    });
    assert.equal(parsed.name, "Boxer BM150");
    assert.equal(parsed.make, validId);
  });

  console.log("\n--- 2. Category & Brand Validation ---");

  test("Category requires non-empty name and handles optional description", () => {
    assert.throws(() => createCategorySchema.parse({ name: "" }));
    const parsed = createCategorySchema.parse({
      name: " Tyre ",
      description: "Outer rubber tyres",
    });
    assert.equal(parsed.name, "Tyre");
    assert.equal(parsed.description, "Outer rubber tyres");
  });

  test("Brand requires non-empty name and trims spaces", () => {
    assert.throws(() => createBrandSchema.parse({ name: "   " }));
    const parsed = createBrandSchema.parse({ name: " Bosch " });
    assert.equal(parsed.name, "Bosch");
  });

  console.log("\n--- 3. Product Attribute Definition Validation ---");

  test("Attribute definition validates key slug pattern", () => {
    assert.throws(() =>
      createProductAttributeSchema.parse({
        name: "Size",
        key: "invalid key with spaces!",
        category: validId,
        type: "text",
      })
    );
    const parsed = createProductAttributeSchema.parse({
      name: "Size",
      key: "size_spec_01",
      category: validId,
      type: "text",
    });
    assert.equal(parsed.key, "size_spec_01");
  });

  test("Select and Multi-Select require at least one non-empty option", () => {
    // Empty options array for select should be rejected
    assert.throws(() =>
      createProductAttributeSchema.parse({
        name: "Position",
        key: "position",
        category: validId,
        type: "select",
        options: [],
      })
    );

    // Array of only empty strings should be rejected
    assert.throws(() =>
      createProductAttributeSchema.parse({
        name: "Position",
        key: "position",
        category: validId,
        type: "select",
        options: ["", "  "],
      })
    );

    // Valid options accepted
    const parsed = createProductAttributeSchema.parse({
      name: "Position",
      key: "position",
      category: validId,
      type: "select",
      options: ["Front", "Rear", "Universal"],
    });
    assert.equal(parsed.options.length, 3);
  });

  test("Text and Number attributes do not require options", () => {
    const textAttr = createProductAttributeSchema.parse({
      name: "Tire Width",
      key: "width",
      category: validId,
      type: "text",
      options: [],
    });
    assert.equal(textAttr.type, "text");

    const numAttr = createProductAttributeSchema.parse({
      name: "Teeth Count",
      key: "teeth",
      category: validId,
      type: "number",
      unit: "T",
    });
    assert.equal(numAttr.unit, "T");
  });

  console.log("\n--- 4. Product Financials, Quantities, & Fitments ---");

  test("Rejects negative prices", () => {
    assert.throws(() =>
      createProductSchema.parse({
        name: "Brake Pad",
        category: validId,
        brand: validId,
        costPrice: -100,
        sellingPrice: 500,
        quantityOnHand: 10,
        reorderLevel: 2,
      })
    );

    assert.throws(() =>
      createProductSchema.parse({
        name: "Brake Pad",
        category: validId,
        brand: validId,
        costPrice: 500,
        sellingPrice: -50,
        quantityOnHand: 10,
        reorderLevel: 2,
      })
    );
  });

  test("Rejects negative and fractional stock quantities (whole units required)", () => {
    // Negative stock
    assert.throws(() =>
      createProductSchema.parse({
        name: "Brake Pad",
        category: validId,
        brand: validId,
        costPrice: 500,
        sellingPrice: 1000,
        quantityOnHand: -5,
        reorderLevel: 2,
      })
    );

    // Fractional stock
    assert.throws(() =>
      createProductSchema.parse({
        name: "Brake Pad",
        category: validId,
        brand: validId,
        costPrice: 500,
        sellingPrice: 1000,
        quantityOnHand: 4.5,
        reorderLevel: 2,
      })
    );

    // Fractional reorder level
    assert.throws(() =>
      createProductSchema.parse({
        name: "Brake Pad",
        category: validId,
        brand: validId,
        costPrice: 500,
        sellingPrice: 1000,
        quantityOnHand: 10,
        reorderLevel: 2.7,
      })
    );
  });

  test("Validates vehicle fitments models and year boundaries", () => {
    // Invalid model ObjectId
    assert.throws(() =>
      createProductSchema.parse({
        name: "Brake Pad",
        category: validId,
        brand: validId,
        costPrice: 500,
        sellingPrice: 1000,
        quantityOnHand: 10,
        reorderLevel: 2,
        vehicleFitments: [{ model: "not-an-id", yearFrom: 2018 }],
      })
    );

    // Out of range year (< 1900 or > 2100)
    assert.throws(() =>
      createProductSchema.parse({
        name: "Brake Pad",
        category: validId,
        brand: validId,
        costPrice: 500,
        sellingPrice: 1000,
        quantityOnHand: 10,
        reorderLevel: 2,
        vehicleFitments: [{ model: validId, yearFrom: 1800 }],
      })
    );

    // Valid fitments accepted
    const parsed = createProductSchema.parse({
      name: "Brake Pad",
      category: validId,
      brand: validId,
      costPrice: 500,
      sellingPrice: 1000,
      quantityOnHand: 10,
      reorderLevel: 2,
      vehicleFitments: [
        { model: validId, yearFrom: 2018, yearTo: 2024, notes: "Front only" },
        { model: validId2, notes: "Universal rear" },
      ],
    });
    assert.equal(parsed.vehicleFitments.length, 2);
  });

  test("Accepts empty fitments array for universal parts", () => {
    const universal = createProductSchema.parse({
      name: "Universal 12V Relay",
      category: validId,
      brand: validId,
      costPrice: 800,
      sellingPrice: 1500,
      quantityOnHand: 20,
      reorderLevel: 5,
      vehicleFitments: [],
    });
    assert.equal(universal.vehicleFitments.length, 0);
  });

  test("Allows optional partNumber and trims properly", () => {
    const withPart = createProductSchema.parse({
      name: "Heavy Duty Chain",
      partNumber: "  CH-428H-120L  ",
      category: validId,
      brand: validId,
      costPrice: 3000,
      sellingPrice: 4500,
      quantityOnHand: 15,
      reorderLevel: 3,
    });
    assert.equal(withPart.partNumber, "CH-428H-120L");

    const withoutPart = createProductSchema.parse({
      name: "Heavy Duty Chain",
      partNumber: "",
      category: validId,
      brand: validId,
      costPrice: 3000,
      sellingPrice: 4500,
      quantityOnHand: 15,
      reorderLevel: 3,
    });
    assert.equal(withoutPart.partNumber, "");
  });

  console.log("\n=======================================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
