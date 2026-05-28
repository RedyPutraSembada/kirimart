<!-- **Notes product schema:**  -->

product-schema.js
originalPrice itu untuk harga coret

<!-- **Notes chart atau checkout:** -->

**Aturan saat di chart atau checkout**
Saat menghitung total harga di keranjang:

1. Ambil jumlah barang (qty) yang dibeli user.
2. Cek apakah produk memiliki discountRules.
3. Jika qty >= discountRules.min_qty, maka harga per item harus dipotong sebesar discountRules.discount%.

Rumus: Total = (Harga _ Qty) _ (1 - (Diskon/100))
