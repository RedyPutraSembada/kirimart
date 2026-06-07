import 'dotenv/config';

async function createAndCancel() {
  const apiKey = process.env.BITESHIP_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  // 1. Create an Order
  const requestBody = {
    origin_area_id: "IDNP6IDNC148IDND836IDZ12410", // Cijeruk
    destination_area_id: "IDNP6IDNC148IDND836IDZ12430", // Bogor Selatan
    courier_company: "jne",
    courier_type: "reg",
    delivery_type: "now",
    items: [
      {
        name: "Test Cancel Product",
        description: "Test cancellation",
        value: 50000,
        weight: 1000,
        quantity: 1,
      }
    ],
    origin_contact_name: "KawanBelanja Admin",
    origin_contact_phone: "08123456789",
    origin_address: "Jl. Cijeruk No 1",
    destination_contact_name: "Buyer",
    destination_contact_phone: "08987654321",
    destination_address: "Jl. Bogor Selatan No 2"
  };

  console.log("Creating order...");
  const createRes = await fetch("https://api.biteship.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": apiKey
    },
    body: JSON.stringify(requestBody)
  });

  const createData = await createRes.json();
  if (!createData.id) {
    console.error("Failed to create:", createData);
    return;
  }

  const orderId = createData.id;
  console.log("✅ Created Order ID:", orderId);

  // Wait a second
  await new Promise(r => setTimeout(r, 1000));

  // 2. Simulate Cancellation
  console.log("Simulating cancellation...");
  const cancelRes = await fetch(`https://api.biteship.com/v1/orders/${orderId}`, {
    method: "DELETE",
    headers: {
      "authorization": apiKey
    }
  });

  const cancelData = await cancelRes.json();
  console.log("✅ Cancellation response:", cancelData.status === 'cancelled' ? "SUCCESS" : cancelData);
}

createAndCancel();
