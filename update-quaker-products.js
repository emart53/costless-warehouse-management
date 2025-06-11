/**
 * Update Quaker Products with Authentic Legacy Data
 * Synchronizes all Quaker products (Vendor ID 31) with legacy system descriptions and details
 */

import pkg from 'pg';
const { Client } = pkg;

async function updateQuakerProducts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('Connected to database');

  // Authentic Quaker product data from legacy system
  const authenticQuakerProducts = [
    { id: 82, description: "Tropicana Twister Tropical Fruit", size: "1.75 LT", casePack: 360, cost: 248.40, offInvoice: 0.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 83, description: "Tropicana Twister Straw Kiwi", size: "1.75 LT", casePack: 360, cost: 248.40, offInvoice: 0.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 84, description: "Tropicana Twister Straw Banana", size: "1.75 LT", casePack: 6, cost: 11.66, offInvoice: 0.00, billBack: 7.56, crv: 0.60, isActive: false },
    { id: 2043, description: "Gatorade Galcier Cherry", size: "20 OZ", casePack: 3, cost: 18.58, offInvoice: 0.00, billBack: 5.81, crv: 1.20, isActive: false },
    { id: 2513, description: "Cheetos Mac & Cheese Shipper", size: "5.9 OZ", casePack: 72, cost: 118.08, offInvoice: 46.08, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1790, description: "Pasta Roni Fettucine Alfredo", size: "4.7 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1791, description: "Pasta Roni Shell/White Cheddar", size: "6.2 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1792, description: "Rice - A Roni Long Grain & Wild", size: "4.3 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1793, description: "Rice - A - Roni Savory Pilaf", size: "7.2 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1794, description: "Rice - A - Roni Beef", size: "6.8 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1795, description: "Rice- A- Roni Chicken", size: "6.9 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1878, description: "Rice A Roni Cilantro Lime Rice", size: "5.6 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1879, description: "Rice A Roni Herb & Butter", size: "7.2 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1880, description: "Pasta Roni BTR/Garlic", size: "4.7 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1881, description: "Rice A Roni Red Bean and Rice", size: "6.4 OZ", casePack: 12, cost: 19.92, offInvoice: 4.68, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1867, description: "Rice A Roni Spanish", size: "6.8 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1868, description: "Rice-A-Roni Mod", size: "ASST", casePack: 1080, cost: 1263.60, offInvoice: 421.20, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 169, description: "Rice - Pasta Roni Pallet Asst", size: "1 CT", casePack: 312, cost: 355.63, offInvoice: 94.75, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1489, description: "Rice a Roni Pasta Roni", size: "ASST", casePack: 304, cost: 355.63, offInvoice: 0.00, billBack: 94.75, crv: 0.00, isActive: false },
    { id: 1788, description: "Pasta Roni Angel Hair Parmesan", size: "5.1 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1789, description: "Pasta Roni Angel Hair W/Herbs", size: "4.8 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1796, description: "Rice-A-Roni Mod", size: "ASST", casePack: 1080, cost: 1944.00, offInvoice: 885.60, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 1797, description: "Pasta Roni Mod.", size: "ASST", casePack: 648, cost: 1166.40, offInvoice: 531.36, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 2528, description: "Rice A Roni Chicken/Garlic", size: "4.3 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2529, description: "Rice A Roni Broc/Augratin", size: "6.5 OZ", casePack: 12, cost: 21.60, offInvoice: 12.60, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2530, description: "Pasta Roni Chicken", size: "4.6 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2531, description: "Pasta Roni Four Cheese", size: "6 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2551, description: "Rice A Roni Low Sodium Chicken", size: "6.90", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2724, description: "Pasta Roni Herb/Butter", size: "5.5 oz", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2760, description: "Rice A Roni Four Cheese", size: "6.4 OZ", casePack: 12, cost: 19.56, offInvoice: 9.12, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2590, description: "Rice A Roni Ched/Broc", size: "6.5 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2591, description: "Rice A Roni Fried Rice", size: "6.2 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2592, description: "Rice A Roni Four Cheese", size: "6 OZ", casePack: 12, cost: 21.60, offInvoice: 9.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2222, description: "Quaker 2 Flvr Oat Square Shipper", size: "14.5 OZ", casePack: 108, cost: 376.92, offInvoice: 171.27, billBack: 11.00, crv: 0.00, isActive: false },
    { id: 2054, description: "Quaker Oatmeal Frt/Cream Var", size: "10.5 OZ", casePack: 12, cost: 48.24, offInvoice: 24.24, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2055, description: "Quaker Instant Oatmeal Apple Cinn", size: "12.1 OZ", casePack: 12, cost: 48.24, offInvoice: 24.24, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1787, description: "Capt. Crunch Peanut Butter", size: "11.4 OZ", casePack: 14, cost: 57.82, offInvoice: 28.70, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1192, description: "Quaker Standard Oats Mix Plt", size: "42 OZ", casePack: 300, cost: 1134.00, offInvoice: 0.00, billBack: 425.86, crv: 0.00, isActive: false },
    { id: 1370, description: "Cap'n Crunch Jumbo 7 Case Mod", size: "13-14 OZ", casePack: 92, cost: 133.40, offInvoice: 0.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1573, description: "Captain Crunch Pallet", size: "12.5-14 OZ", casePack: 14, cost: 733.36, offInvoice: 302.09, billBack: 109.18, crv: 0.00, isActive: false },
    { id: 763, description: "Quaker Oat Round Pallets", size: "42 OZ", casePack: 12, cost: 21.86, offInvoice: 0.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 817, description: "Life Cereal 9 Case Mod", size: "13OZ", casePack: 108, cost: 400.68, offInvoice: 186.84, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 818, description: "Capt Crunch Crunch Berries", size: "11.7OZ", casePack: 14, cost: 60.76, offInvoice: 32.76, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 819, description: "Quaker Inst. Strawberry & Cream", size: "12.3OZ", casePack: 12, cost: 48.24, offInvoice: 24.24, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 845, description: "Captain Crunch P/Butter", size: "12.5 OZ", casePack: 14, cost: 47.74, offInvoice: 20.60, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 846, description: "Captain Crunch Original", size: "12.6 OZ", casePack: 14, cost: 60.76, offInvoice: 32.76, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 847, description: "Captain Crunch Berries", size: "13 OZ", casePack: 14, cost: 47.74, offInvoice: 0.00, billBack: 20.60, crv: 0.00, isActive: false },
    { id: 867, description: "Captain Crunch Mixed Pallet", size: "14-16 OZ", casePack: 308, cost: 458.48, offInvoice: 0.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 951, description: "Life Cereal", size: "18 OZ", casePack: 14, cost: 54.04, offInvoice: 0.00, billBack: 21.28, crv: 0.00, isActive: false },
    { id: 1029, description: "Quaker Oat Rounds", size: "42 OZ", casePack: 288, cost: 1088.64, offInvoice: 0.00, billBack: 517.20, crv: 0.00, isActive: false },
    { id: 150, description: "Quaker Oat Rounds Mixed Plt", size: "42 OZ", casePack: 360, cost: 734.40, offInvoice: 0.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 245, description: "Quaker White Cedd Mini Rice CK", size: "3.03 oz", casePack: 12, cost: 26.64, offInvoice: 10.08, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 342, description: "Quaker Oat Rounds Mixed Plt", size: "42 OZ", casePack: 300, cost: 1884.00, offInvoice: 838.50, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 440, description: "Quaker Life Cinnamon", size: "13 OZ", casePack: 12, cost: 36.72, offInvoice: 0.00, billBack: 17.50, crv: 0.00, isActive: false },
    { id: 441, description: "Quaker Life Cereal", size: "21 OZ", casePack: 14, cost: 49.98, offInvoice: 0.00, billBack: 22.20, crv: 0.00, isActive: false },
    { id: 458, description: "Quaker Life Cereal Mixed Plt", size: "21 OZ", casePack: 252, cost: 876.51, offInvoice: 0.00, billBack: 498.51, crv: 0.00, isActive: false },
    { id: 474, description: "Captain Crunch Pallet", size: "15-16 OZ", casePack: 168, cost: 552.72, offInvoice: 0.00, billBack: 300.68, crv: 0.00, isActive: false },
    { id: 498, description: "Quaker Old Fashioned Oats", size: "42 OZ", casePack: 12, cost: 75.36, offInvoice: 32.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 499, description: "Quaker Quick Oat Rounds", size: "42 OZ", casePack: 12, cost: 75.36, offInvoice: 32.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 500, description: "Quaker Oat Squares Original", size: "16 OZ", casePack: 12, cost: 43.68, offInvoice: 0.00, billBack: 23.68, crv: 0.00, isActive: false },
    { id: 512, description: "Quaker Oat Round Mix Pallet", size: "42 OZ", casePack: 144, cost: 273.12, offInvoice: 0.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 654, description: "Quaker Cinnamon Oat Squares", size: "16 OZ", casePack: 12, cost: 40.44, offInvoice: 0.00, billBack: 21.44, crv: 0.00, isActive: false },
    { id: 609, description: "Quaker Instant Oats Mod", size: "SINGLES", casePack: 240, cost: 727.10, offInvoice: 245.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1636, description: "Captain Crunch Christmas Crunch", size: "ASST", casePack: 92, cost: 304.52, offInvoice: 160.97, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1654, description: "Captain Crunch Display", size: "13-14 OZ", casePack: 92, cost: 313.72, offInvoice: 0.00, billBack: 167.32, crv: 0.00, isActive: false },
    { id: 751, description: "Life Cereal Regular", size: "13 OZ", casePack: 12, cost: 46.80, offInvoice: 22.80, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1871, description: "Quaker Cereal 100% Nat Oat & Hny", size: "28 OZ", casePack: 12, cost: 53.52, offInvoice: 17.52, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1872, description: "Quaker Cereal 100% Nat Oats H.R.", size: "28 OZ", casePack: 12, cost: 53.52, offInvoice: 17.52, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1873, description: "Quaker Capt N Crunchberries", size: "11.7 OZ", casePack: 14, cost: 60.76, offInvoice: 32.76, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1874, description: "Quaker Capt N Origanal", size: "12.6 OZ", casePack: 14, cost: 60.76, offInvoice: 32.76, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1875, description: "Quaker Cereal Life Cinnamon", size: "13 OZ", casePack: 12, cost: 40.44, offInvoice: 18.00, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2187, description: "Quaker Cinnamon Life", size: "18 OZ", casePack: 14, cost: 70.98, offInvoice: 29.78, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2188, description: "Quaker Life Regular", size: "18 OZ", casePack: 14, cost: 70.98, offInvoice: 29.78, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2207, description: "Quaker Nat Cereal Oats/Honey", size: "28 OZ", casePack: 10, cost: 44.60, offInvoice: 14.90, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2208, description: "Quaker 100% Natural Raisin", size: "28 OZ", casePack: 10, cost: 44.60, offInvoice: 14.90, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1824, description: "Quaker Cereal Oat Squares Cinn.", size: "14.5", casePack: 12, cost: 50.76, offInvoice: 25.32, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1825, description: "Quaker Cereal Oat Sq. Brn Sugar", size: "14 OZ", casePack: 12, cost: 50.76, offInvoice: 25.32, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1826, description: "Quaker Cereal Life Regular", size: "18 OZ", casePack: 14, cost: 55.72, offInvoice: 22.48, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1827, description: "Quaker Cereal Life Cinnamon", size: "14.5 OZ", casePack: 14, cost: 55.72, offInvoice: 22.48, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2441, description: "Captain Crucnh Orig. Large", size: "18 OZ", casePack: 12, cost: 61.32, offInvoice: 25.80, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2442, description: "Captain Crunch Crucnchberry", size: "18.7OZ", casePack: 12, cost: 61.32, offInvoice: 25.80, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2477, description: "Quaker Captain Crunch Berries", size: "16.8 OZ", casePack: 1, cost: 52.50, offInvoice: 21.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2210, description: "Quaker Choc. Crunch Mini", size: "3.52 oz", casePack: 12, cost: 26.64, offInvoice: 10.08, billBack: 0.00, crv: 0.00, isActive: true },
    { id: 2228, description: "Quaker Oats Pallet", size: "18 OZ", casePack: 100, cost: 248.02, offInvoice: 94.00, billBack: 30.00, crv: 0.00, isActive: false },
    { id: 2229, description: "Quaker Oats PLT", size: "42 OZ", casePack: 180, cost: 757.80, offInvoice: 338.70, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2237, description: "Quaker Life Display", size: "13 OZ", casePack: 108, cost: 330.48, offInvoice: 134.52, billBack: 30.00, crv: 0.00, isActive: false },
    { id: 2343, description: "Quaker Life Cinn.", size: "13 OZ", casePack: 12, cost: 46.80, offInvoice: 22.80, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2344, description: "Quaker Life Regular", size: "13 OZ", casePack: 12, cost: 46.80, offInvoice: 18.12, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2347, description: "Quaker Oatmeal Squares Cinn.", size: "14 OZ", casePack: 12, cost: 50.76, offInvoice: 25.32, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2348, description: "Quaker Instant Oatmeal", size: "9.8 OZ", casePack: 12, cost: 48.24, offInvoice: 20.40, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2211, description: "Quaker Pop Rice Chili", size: "3.0 OZ", casePack: 12, cost: 26.54, offInvoice: 10.08, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2419, description: "Quaker Standard Oatmeal", size: "18 OZ", casePack: 12, cost: 45.00, offInvoice: 16.44, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2420, description: "Quaker Old Fashioned Oatmeal", size: "18 OZ", casePack: 12, cost: 45.00, offInvoice: 16.44, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2421, description: "Quaker Quick Oats Gluten Free", size: "18 OZ", casePack: 12, cost: 57.84, offInvoice: 21.12, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2515, description: "CHTS Bold Chs & Mac CP", size: "2.29 OZ", casePack: 12, cost: 19.68, offInvoice: 7.68, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2506, description: "Quaker Big Chewy Choc. Chip", size: "7.4 OZ", casePack: 12, cost: 32.28, offInvoice: 11.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2209, description: "Quaker Crisp Mini Carmel Rice", size: "3.52 OZ", casePack: 12, cost: 26.54, offInvoice: 10.08, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2101, description: "Quaker Oatmeal Maple Brown", size: "10.4 OZ", casePack: 12, cost: 48.24, offInvoice: 24.24, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2102, description: "Quaker Oatmeal Inst Var PK", size: "10.5 OZ", casePack: 12, cost: 48.24, offInvoice: 24.24, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2103, description: "Quaker Oatmeal Inst.Raisin Walnut", size: "10.4 OZ", casePack: 12, cost: 48.24, offInvoice: 24.24, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2146, description: "Cap'n Crunch 3 Flavor Pallet", size: "ASST", casePack: 206, cost: 702.46, offInvoice: 277.66, billBack: 55.00, crv: 0.00, isActive: false },
    { id: 2170, description: "Quaker Chewy Choc Chip", size: "8 OZ", casePack: 12, cost: 35.52, offInvoice: 14.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2171, description: "Quaker Chewy Var Pack", size: "8 OZ", casePack: 12, cost: 35.52, offInvoice: 14.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2172, description: "Quaker Chewy Dipps CC", size: "8 CT", casePack: 12, cost: 35.52, offInvoice: 14.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2173, description: "Quaker Chewy Dipps PB", size: "8 CT", casePack: 12, cost: 35.52, offInvoice: 14.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 2174, description: "Quaker PB", size: "8 OZ", casePack: 12, cost: 35.52, offInvoice: 14.28, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1725, description: "Quaker Inst Oats Raisin Spice", size: "12.10 oz", casePack: 12, cost: 48.24, offInvoice: 24.24, billBack: 0.00, crv: 0.00, isActive: false },
    { id: 1784, description: "Quaker Oats Quick 1 Min.", size: "42 OZ", casePack: 12, cost: 75.36, offInvoice: 33.54, billBack: 0.00, crv: 0.00, isActive: false }
  ];

  let updated = 0;
  let notFound = 0;

  console.log(`Starting update of ${authenticQuakerProducts.length} Quaker products...`);

  for (const product of authenticQuakerProducts) {
    try {
      const result = await client.query(`
        UPDATE products 
        SET 
          product_description = $1,
          size = $2,
          case_pack = $3,
          purchase_cost = $4,
          off_invoice = $5,
          bill_back = $6,
          crv = $7,
          status = $8,
          updated_at = NOW()
        WHERE product_id = $9 AND vendor_id = 31
        RETURNING product_id
      `, [
        product.description,
        product.size,
        product.casePack,
        product.cost,
        product.offInvoice,
        product.billBack,
        product.crv,
        product.isActive ? 'Active' : 'Discontinued',
        product.id
      ]);

      if (result.rowCount > 0) {
        updated++;
        console.log(`✓ Updated product ${product.id}: ${product.description}`);
      } else {
        notFound++;
        console.log(`⚠ Product ${product.id} not found in database`);
      }
    } catch (error) {
      console.error(`✗ Error updating product ${product.id}:`, error.message);
    }
  }

  console.log(`\nUpdate complete:`);
  console.log(`- Products updated: ${updated}`);
  console.log(`- Products not found: ${notFound}`);

  await client.end();
}

updateQuakerProducts().catch(console.error);