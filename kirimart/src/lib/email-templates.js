const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #333;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
`;

const HEADER_STYLE = `
  background-color: #1a1a1a;
  color: #fff;
  padding: 20px;
  text-align: center;
  border-radius: 8px 8px 0 0;
  font-size: 24px;
  font-weight: bold;
`;

const CONTENT_STYLE = `
  background-color: #ffffff;
  padding: 30px;
  border-radius: 0 0 8px 8px;
  border: 1px solid #e0e0e0;
  border-top: none;
`;

const BUTTON_STYLE = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #3b82f6;
  color: #ffffff;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
  margin-top: 20px;
`;

const FOOTER_STYLE = `
  text-align: center;
  margin-top: 20px;
  font-size: 12px;
  color: #888;
`;

export function getPaymentSuccessEmail(buyerName, orderId, amount) {
  return `
    <div style="${BASE_STYLE}">
      <div style="${HEADER_STYLE}">Kawan Belanja</div>
      <div style="${CONTENT_STYLE}">
        <h2>Pembayaran Berhasil!</h2>
        <p>Halo <strong>${buyerName}</strong>,</p>
        <p>Terima kasih! Kami telah menerima pembayaran Anda sebesar <strong>${amount}</strong> untuk pesanan <strong>#${orderId}</strong>.</p>
        <p>Pesanan Anda saat ini sedang diteruskan ke pihak penjual untuk segera diproses.</p>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/user-dashboard/orders" style="${BUTTON_STYLE}">Cek Pesanan Saya</a>
        </div>
      </div>
      <div style="${FOOTER_STYLE}">
        &copy; ${new Date().getFullYear()} Kawan Belanja. All rights reserved.
      </div>
    </div>
  `;
}

export function getNewOrderEmail(sellerName, orderId, buyerName, itemsCount) {
  return `
    <div style="${BASE_STYLE}">
      <div style="${HEADER_STYLE}">Kawan Belanja Seller</div>
      <div style="${CONTENT_STYLE}">
        <h2>Pesanan Baru Masuk! 🎉</h2>
        <p>Halo <strong>${sellerName}</strong>,</p>
        <p>Hore! Anda mendapatkan pesanan baru (Order <strong>#${orderId}</strong>) dari <strong>${buyerName}</strong>.</p>
        <p>Terdapat ${itemsCount} produk dalam pesanan ini yang menunggu untuk segera Anda kemas.</p>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/seller-dashboard/orders" style="${BUTTON_STYLE}">Proses Pesanan Sekarang</a>
        </div>
      </div>
      <div style="${FOOTER_STYLE}">
        &copy; ${new Date().getFullYear()} Kawan Belanja. All rights reserved.
      </div>
    </div>
  `;
}

export function getOrderProcessingEmail(buyerName, orderId, sellerName) {
  return `
    <div style="${BASE_STYLE}">
      <div style="${HEADER_STYLE}">Kawan Belanja</div>
      <div style="${CONTENT_STYLE}">
        <h2>Pesanan Anda Sedang Dikemas 📦</h2>
        <p>Halo <strong>${buyerName}</strong>,</p>
        <p>Kabar baik! Penjual <strong>${sellerName}</strong> saat ini sedang menyiapkan dan mengemas pesanan Anda (Order <strong>#${orderId}</strong>).</p>
        <p>Anda akan menerima email pemberitahuan lebih lanjut beserta nomor resi pelacakan saat paket sudah diserahkan ke pihak logistik.</p>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/user-dashboard/orders" style="${BUTTON_STYLE}">Pantau Pesanan Anda</a>
        </div>
      </div>
      <div style="${FOOTER_STYLE}">
        &copy; ${new Date().getFullYear()} Kawan Belanja. All rights reserved.
      </div>
    </div>
  `;
}

export function getOrderShippedEmail(buyerName, orderId, courier, awbNumber) {
  return `
    <div style="${BASE_STYLE}">
      <div style="${HEADER_STYLE}">Kawan Belanja</div>
      <div style="${CONTENT_STYLE}">
        <h2>Pesanan Anda Sedang Dikirim 🚚</h2>
        <p>Halo <strong>${buyerName}</strong>,</p>
        <p>Penjual telah menyerahkan pesanan Anda (Order <strong>#${orderId}</strong>) ke kurir <strong>${courier.toUpperCase()}</strong>.</p>
        <p>Nomor Resi Pelacakan: <strong style="font-size: 18px; color: #3b82f6;">${awbNumber}</strong></p>
        <p>Anda bisa melacak pergerakan paket secara langsung di dashboard Kawan Belanja.</p>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/user-dashboard/orders" style="${BUTTON_STYLE}">Lacak Pesanan</a>
        </div>
      </div>
      <div style="${FOOTER_STYLE}">
        &copy; ${new Date().getFullYear()} Kawan Belanja. All rights reserved.
      </div>
    </div>
  `;
}

export function getOrderDeliveredEmail(buyerName, orderId) {
  return `
    <div style="${BASE_STYLE}">
      <div style="${HEADER_STYLE}">Kawan Belanja</div>
      <div style="${CONTENT_STYLE}">
        <h2>Paket Telah Sampai! 📦</h2>
        <p>Halo <strong>${buyerName}</strong>,</p>
        <p>Menurut laporan kurir, pesanan Anda (Order <strong>#${orderId}</strong>) telah berhasil diantarkan ke alamat tujuan.</p>
        <p>Silakan periksa paket Anda. Jika semuanya sudah sesuai, mohon klik <strong>"Pesanan Diterima"</strong> dan berikan ulasan terbaik Anda untuk mendukung penjual!</p>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/user-dashboard/orders" style="${BUTTON_STYLE}">Konfirmasi Terima Barang</a>
        </div>
      </div>
      <div style="${FOOTER_STYLE}">
        &copy; ${new Date().getFullYear()} Kawan Belanja. All rights reserved.
      </div>
    </div>
  `;
}

export function getWithdrawalProcessedEmail(sellerName, amount, status, reason = "") {
  const isApproved = status === "completed";
  const statusLabel = isApproved ? "Disetujui" : "Ditolak";
  const icon = isApproved ? "✅" : "❌";
  const message = isApproved 
    ? "Dana telah berhasil ditransfer ke rekening bank Anda. Silakan cek mutasi rekening Anda dalam 1x24 jam kerja." 
    : "Permintaan penarikan dana Anda ditolak karena alasan berikut: <strong>" + reason + "</strong>. Saldo telah dikembalikan ke dompet toko Anda.";

  return `
    <div style="${BASE_STYLE}">
      <div style="${HEADER_STYLE}">Kawan Belanja Finance</div>
      <div style="${CONTENT_STYLE}">
        <h2>Penarikan Dana ${statusLabel} ${icon}</h2>
        <p>Halo <strong>${sellerName}</strong>,</p>
        <p>Permintaan penarikan dana (Withdrawal) sebesar <strong style="font-size: 18px;">Rp ${amount.toLocaleString('id-ID')}</strong> telah diperiksa oleh tim Admin Kawan Belanja.</p>
        <p>Status: <strong style="color: ${isApproved ? '#10b981' : '#ef4444'};">${statusLabel}</strong></p>
        <div style="padding: 15px; background-color: #f3f4f6; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 0;">${message}</p>
        </div>
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/seller-dashboard/wallet" style="${BUTTON_STYLE}">Cek Dompet Toko</a>
        </div>
      </div>
      <div style="${FOOTER_STYLE}">
        &copy; ${new Date().getFullYear()} Kawan Belanja. All rights reserved.
      </div>
    </div>
  `;
}
