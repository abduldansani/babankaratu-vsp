import assert from "node:assert/strict";
import dbConnect from "../src/lib/dbConnect";
import {
  VehicleMake,
  VehicleModel,
  Category,
  ProductAttributeDefinition,
  Brand,
  Product,
} from "../src/models";
import {
  createVehicleMake,
  deleteVehicleMake,
  createVehicleModel,
  deleteVehicleModel,
} from "../src/actions/vehicleActions";
import {
  createCategory,
  deleteCategory,
} from "../src/actions/categoryActions";
import {
  createAttributeDefinition,
  deleteAttributeDefinition,
} from "../src/actions/attributeActions";
import {
  createBrand,
  deleteBrand,
} from "../src/actions/brandActions";
import {
  createProduct,
  getProducts,
  deleteProduct,
} from "../src/actions/productActions";

async function runIntegration() {
  console.log("\n=======================================================");
  console.log("RUNNING END-TO-END DATABASE INTEGRATION TESTS");
  console.log("=======================================================\n");

  try {
    const conn = await dbConnect();
    console.log("✓ Connected to MongoDB:", conn.connection.name);
  } catch (err) {
    console.log("ℹ Local MongoDB is not running or unreachable:", (err as Error).message);
    console.log("Skipping live database integration tests.");
    return;
  }

  try {
    // 1. Create Vehicle Make
    console.log("\n1. Testing Vehicle Make CRUD & Safe Deletion...");
    const makeRes = await createVehicleMake({ name: "Test Make " + Date.now() });
    assert.equal(makeRes.success, true);
    const makeId = String((makeRes.data as any)._id);
    console.log("  ✓ Vehicle Make created:", (makeRes.data as any).name);

    // Duplicate make prevention
    const duplicateMakeRes = await createVehicleMake({ name: (makeRes.data as any).name });
    assert.equal(duplicateMakeRes.success, false);
    console.log("  ✓ Duplicate make prevented:", duplicateMakeRes.error);

    // 2. Create Vehicle Model under Make
    console.log("\n2. Testing Vehicle Model CRUD & Dependency Checks...");
    const modelRes = await createVehicleModel({
      name: "Test Model " + Date.now(),
      make: makeId,
    });
    assert.equal(modelRes.success, true);
    const modelId = String((modelRes.data as any)._id);
    console.log("  ✓ Vehicle Model created:", (modelRes.data as any).name);

    // Make deletion blocked because model depends on it
    const makeDelBlocked = await deleteVehicleMake(makeId);
    assert.equal(makeDelBlocked.success, false);
    console.log("  ✓ Vehicle Make deletion blocked when model exists:", makeDelBlocked.error);

    // 3. Create Category
    console.log("\n3. Testing Category CRUD & Dependency Checks...");
    const catRes = await createCategory({
      name: "Test Category " + Date.now(),
      description: "Integration test category",
    });
    assert.equal(catRes.success, true);
    const catId = String((catRes.data as any)._id);
    console.log("  ✓ Category created:", (catRes.data as any).name);

    // 4. Create Product Attribute Definition
    console.log("\n4. Testing Attribute Definitions...");
    const attrRes = await createAttributeDefinition({
      name: "Wheel Size",
      key: "wheel_size",
      category: catId,
      type: "select",
      required: true,
      options: ["17-inch", "18-inch", "19-inch"],
      unit: "in",
      displayOrder: 1,
    });
    assert.equal(attrRes.success, true);
    const attrId = String((attrRes.data as any)._id);
    console.log("  ✓ Attribute definition created:", (attrRes.data as any).name);

    // Category deletion blocked because attribute exists
    const catDelBlocked = await deleteCategory(catId);
    assert.equal(catDelBlocked.success, false);
    console.log("  ✓ Category deletion blocked when attribute exists:", catDelBlocked.error);

    // 5. Create Brand
    console.log("\n5. Testing Brand...");
    const brandRes = await createBrand({ name: "Test Brand " + Date.now() });
    assert.equal(brandRes.success, true);
    const brandId = String((brandRes.data as any)._id);
    console.log("  ✓ Brand created:", (brandRes.data as any).name);

    // 6. Create Product with Dynamic Attributes & Vehicle Fitments
    console.log("\n6. Testing Product Creation with Dynamic Attributes...");
    const prodRes = await createProduct({
      name: "Test Heavy Tyre " + Date.now(),
      partNumber: "TEST-PART-" + Date.now(),
      description: "Integration test product",
      category: catId,
      brand: brandId,
      costPrice: 12000,
      sellingPrice: 16500,
      quantityOnHand: 10,
      reorderLevel: 3,
      vehicleFitments: [{ model: modelId, notes: "Direct fit" }],
      attributes: {
        wheel_size: "18-inch",
      },
    });
    assert.equal(prodRes.success, true);
    const prodId = (prodRes.data as any)._id;
    console.log("  ✓ Product created successfully with ID:", prodId);

    // Brand deletion blocked because product depends on it
    const brandDelBlocked = await deleteBrand(brandId);
    assert.equal(brandDelBlocked.success, false);
    console.log("  ✓ Brand deletion blocked when product exists:", brandDelBlocked.error);

    // Vehicle model deletion blocked because product fitment depends on it
    const modelDelBlocked = await deleteVehicleModel(modelId);
    assert.equal(modelDelBlocked.success, false);
    console.log("  ✓ Model deletion blocked when product fitment exists:", modelDelBlocked.error);

    // Attribute deletion blocked because product has data stored for it
    const attrDelBlocked = await deleteAttributeDefinition(attrId);
    assert.equal(attrDelBlocked.success, false);
    console.log("  ✓ Attribute deletion blocked when product data exists:", attrDelBlocked.error);

    // 7. Cleanup
    console.log("\n7. Testing Clean Tear-down...");
    const prodDel = await deleteProduct(prodId);
    assert.equal(prodDel.success, true);
    console.log("  ✓ Product deleted.");

    const attrDel = await deleteAttributeDefinition(attrId);
    assert.equal(attrDel.success, true);
    console.log("  ✓ Attribute deleted.");

    const catDel = await deleteCategory(catId);
    assert.equal(catDel.success, true);
    console.log("  ✓ Category deleted.");

    const modelDel = await deleteVehicleModel(modelId);
    assert.equal(modelDel.success, true);
    console.log("  ✓ Vehicle Model deleted.");

    const makeDel = await deleteVehicleMake(makeId);
    assert.equal(makeDel.success, true);
    console.log("  ✓ Vehicle Make deleted.");

    const brandDel = await deleteBrand(brandId);
    assert.equal(brandDel.success, true);
    console.log("  ✓ Brand deleted.");

    console.log("\n=======================================================");
    console.log("ALL INTEGRATION TESTS PASSED PERFECTLY!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runIntegration();
