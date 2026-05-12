// Data mock sementara sebelum Anda mendapatkan API Key resmi KiriminAja

export const mockProvinces = [
	{ id: "11", name: "ACEH" },
	{ id: "12", name: "SUMATERA UTARA" },
	{ id: "31", name: "DKI JAKARTA" },
	{ id: "32", name: "JAWA BARAT" },
	{ id: "33", name: "JAWA TENGAH" },
	{ id: "34", name: "DI YOGYAKARTA" },
	{ id: "35", name: "JAWA TIMUR" },
];

export const mockCities = {
	"31": [ // DKI JAKARTA
		{ id: "3171", name: "JAKARTA SELATAN" },
		{ id: "3172", name: "JAKARTA TIMUR" },
		{ id: "3173", name: "JAKARTA PUSAT" },
	],
	"34": [ // DI YOGYAKARTA
		{ id: "3404", name: "SLEMAN" },
		{ id: "3471", name: "YOGYAKARTA" },
	],
	"32": [ // JAWA BARAT
		{ id: "3273", name: "BANDUNG" },
		{ id: "3276", name: "DEPOK" },
	]
};

export const mockKecamatan = {
	"3171": [ // JAKARTA SELATAN
		{ id: "317101", name: "TEBET" },
		{ id: "317102", name: "SETIABUDI" },
	],
	"3404": [ // SLEMAN
		{ id: "340401", name: "DEPOK" },
		{ id: "340402", name: "GAMPING" },
		{ id: "340403", name: "NGAGLIK" },
	],
	"3273": [ // BANDUNG
		{ id: "327301", name: "COBLONG" },
		{ id: "327302", name: "ANDIR" },
	]
};

export const mockKelurahan = {
	"317101": [ // TEBET
		{ id: "3171011001", name: "TEBET BARAT", zipcode: "12810" },
		{ id: "3171011002", name: "TEBET TIMUR", zipcode: "12820" },
	],
	"340401": [ // DEPOK SLEMAN
		{ id: "3404012001", name: "CATURTUNGGAL", zipcode: "55281" },
		{ id: "3404012002", name: "MAGUWOHARJO", zipcode: "55282" },
		{ id: "3404012003", name: "CONDONGCATUR", zipcode: "55283" },
	],
	"340403": [ // NGAGLIK
		{ id: "3404032001", name: "MINOMARTANI", zipcode: "55581" },
		{ id: "3404032002", name: "SINDONHARJO", zipcode: "55581" },
	]
};
