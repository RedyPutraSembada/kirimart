import 'dotenv/config';

async function testBiteship() {
  const apiKey = process.env.BITESHIP_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  // Bogor Selatan (dest) and Cijeruk (origin)
  // Let's search area to get real area IDs first just in case
  const searchArea = async (query) => {
    const res = await fetch(`https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(query)}&type=single`, {
      headers: { "authorization": apiKey }
    });
    return res.json();
  };

  const bogorSelatan = await searchArea("Bogor Selatan Bogor");
  const cijeruk = await searchArea("Cijeruk Bogor");
  
  console.log("Bogor Selatan ID:", bogorSelatan.areas?.[0]?.id);
  console.log("Cijeruk ID:", cijeruk.areas?.[0]?.id);

  const destAreaId = bogorSelatan.areas?.[0]?.id || "IDNP6IDNC148IDND836IDZ12430";
  const originAreaId = cijeruk.areas?.[0]?.id || "IDNP6IDNC148IDND836IDZ12410";

  const requestBody = {
    origin_area_id: originAreaId,
    destination_area_id: destAreaId,
    couriers: "jne,sicepat,jnt,anteraja",
    items: [
      {
        name: "Produk",
        description: "",
        value: 50000,
        weight: 1000,
        quantity: 1,
        length: 10,
        width: 10,
        height: 10,
      }
    ]
  };

  console.log("Fetching rates...");
  const rateRes = await fetch("https://api.biteship.com/v1/rates/couriers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": apiKey
    },
    body: JSON.stringify(requestBody)
  });

  const rateData = await rateRes.json();
  console.log("Rates Result:", JSON.stringify(rateData, null, 2));
}

testBiteship();
