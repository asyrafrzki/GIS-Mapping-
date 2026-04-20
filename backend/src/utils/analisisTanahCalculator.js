function mround(value, multiple = 0.25) {
  return Math.round(value / multiple) * multiple;
}

function generateRecommendations({
  umur,
  n,
  p,
  k,
  mg,
  urea_akhir,
  tsp_akhir,
  kcl_akhir,
  dolomit_akhir,
}) {
  const recs = [];

  const pupukRank = [
    { name: 'Urea', value: urea_akhir },
    { name: 'TSP', value: tsp_akhir },
    { name: 'KCl', value: kcl_akhir },
    { name: 'Dolomit', value: dolomit_akhir },
  ].sort((a, b) => b.value - a.value);

  if (pupukRank[0].value > 0 && pupukRank[1].value > 0) {
    recs.push(
      `Prioritaskan aplikasi ${pupukRank[0].name} dan ${pupukRank[1].name} karena dosis akhirnya paling tinggi.`
    );
  } else if (pupukRank[0].value > 0) {
    recs.push(
      `Prioritaskan aplikasi ${pupukRank[0].name} karena menjadi kebutuhan pupuk tertinggi pada lahan ini.`
    );
  }

  if (umur <= 8) {
    if (n < 2.6) recs.push('Kandungan N masih rendah untuk tanaman muda, sehingga kebutuhan Urea perlu diperhatikan.');
    if (p < 0.17) recs.push('Kandungan P masih rendah, sehingga aplikasi TSP perlu diprioritaskan.');
    if (k < 0.9) recs.push('Kandungan K masih rendah, sehingga aplikasi KCl perlu diperhatikan.');
    if (mg < 0.25) recs.push('Kandungan Mg masih rendah, sehingga dolomit disarankan untuk membantu perbaikan tanah.');
  } else if (umur <= 13) {
    if (n < 2.5) recs.push('Kandungan N masih rendah pada fase tanaman ini, sehingga Urea masih perlu diperkuat.');
    if (p < 0.155) recs.push('Kandungan P masih rendah, sehingga TSP tetap diperlukan.');
    if (k < 0.8) recs.push('Kandungan K masih rendah, sehingga KCl perlu diprioritaskan.');
    if (mg < 0.2) recs.push('Kandungan Mg masih rendah, sehingga dolomit perlu dipertimbangkan.');
  } else {
    if (n < 2.4) recs.push('Kandungan N masih rendah untuk tanaman tua, sehingga kebutuhan Urea masih perlu diperhatikan.');
    if (p < 0.15) recs.push('Kandungan P masih rendah, sehingga TSP tetap diperlukan.');
    if (k < 0.7) recs.push('Kandungan K masih rendah, sehingga KCl perlu diprioritaskan.');
    if (mg < 0.18) recs.push('Kandungan Mg masih rendah, sehingga dolomit perlu dipertimbangkan.');
  }

  if (dolomit_akhir >= 2.5) {
    recs.push('Dosis dolomit cukup tinggi, sehingga perbaikan kondisi tanah menjadi bagian penting dalam rekomendasi pemupukan.');
  }

  if (kcl_akhir >= 2) {
    recs.push('Kebutuhan KCl cukup tinggi, menandakan unsur kalium perlu menjadi perhatian utama pada lahan ini.');
  }

  if (urea_akhir >= 2) {
    recs.push('Dosis Urea relatif tinggi, sehingga unsur nitrogen menjadi faktor penting dalam rekomendasi pemupukan.');
  }

  recs.push('Lakukan aplikasi pupuk sesuai pembagian tahap aplikasi 1 dan aplikasi 2 agar penyerapan unsur lebih optimal.');
  recs.push('Lakukan evaluasi ulang setelah aplikasi 2 untuk melihat perubahan kondisi unsur hara tanah.');

  return [...new Set(recs)];
}

export function calculateSoilAnalysis(input) {
  const umur = Number(input.umur);
  const luas = Number(input.luas);
  const protas = Number(input.protas);
  const jumlahPohon = Number(input.jumlahPohon);
  const n = Number(input.n);
  const p = Number(input.p);
  const k = Number(input.k);
  const mg = Number(input.mg);

  if ([umur, luas, protas, jumlahPohon, n, p, k, mg].some((v) => Number.isNaN(v))) {
    throw new Error('Semua input harus berupa angka.');
  }

  if (jumlahPohon <= 0) {
    throw new Error('Jumlah pohon harus lebih dari 0.');
  }

  const produksi = protas * luas * 1000;
  const prodPerPohon = produksi / jumlahPohon;

  const prod_n =
    (1229.02 * Math.exp(-((umur - 14.6) ** 2 / (2 * 262.7 ** 2))) - 1226.92) * 0.6;

  const prod_p =
    (514.95 * Math.exp(-((umur - 14.6) ** 2 / (2 * 278.6 ** 2))) - 514.17) * 0.3;

  const prod_k =
    (1031.36 * Math.exp(-((umur - 14.6) ** 2 / (2 * 262.9 ** 2))) - 1029.61) * 0.6;

  const prod_mg =
    (516.26 * Math.exp(-((umur - 14.6) ** 2 / (2 * 246 ** 2))) - 515.26);

  const bio_n = ((-0.0058 * (umur ** 2)) + (0.1691 * umur) + 0.1289) * 0.6;
  const bio_p = ((-0.0043 * (umur ** 2)) + (0.1244 * umur) + 0.0949) * 0.3;
  const bio_k = ((-0.0075 * (umur ** 2)) + (0.218 * umur) + 0.1662) * 0.6;
  const bio_mg = ((-0.0033 * (umur ** 2)) + (0.0972 * umur) + 0.741);

  const urea_awal = mround(prod_n + bio_n, 0.25);
  const tsp_awal = mround(prod_p + bio_p, 0.25);
  const kcl_awal = mround(prod_k + bio_k, 0.25);
  const dolomit_awal = mround(prod_mg + bio_mg, 0.25);

  let urea_akhir = urea_awal;
  let tsp_akhir = tsp_awal;
  let kcl_akhir = kcl_awal;
  let dolomit_akhir = dolomit_awal;

  if (umur <= 8) {
    if (n < 2.6) urea_akhir += 0.25;
    if (p < 0.17) tsp_akhir += 0.25;
    if (k < 0.9) kcl_akhir += 0.25;
    if (mg < 0.25) dolomit_akhir += 0.25;
  } else if (umur <= 13) {
    if (n < 2.5) urea_akhir += 0.25;
    if (p < 0.155) tsp_akhir += 0.25;
    if (k < 0.8) kcl_akhir += 0.25;
    if (mg < 0.2) dolomit_akhir += 0.25;
  } else {
    if (n < 2.4) urea_akhir += 0.25;
    if (p < 0.15) tsp_akhir += 0.25;
    if (k < 0.7) kcl_akhir += 0.25;
    if (mg < 0.18) dolomit_akhir += 0.25;
  }

  const urea_app1 = mround(urea_akhir * 0.6, 0.25);
  const tsp_app1 = mround(tsp_akhir * 0.6, 0.25);
  const kcl_app1 = mround(kcl_akhir * 0.6, 0.25);
  const dolomit_app1 = mround(dolomit_akhir * 0.6, 0.25);

  const urea_app2 = mround(urea_akhir * 0.4, 0.25);
  const tsp_app2 = mround(tsp_akhir * 0.4, 0.25);
  const kcl_app2 = mround(kcl_akhir * 0.4, 0.25);
  const dolomit_app2 = mround(dolomit_akhir * 0.4, 0.25);

  const recommendations = generateRecommendations({
    umur,
    n,
    p,
    k,
    mg,
    urea_akhir,
    tsp_akhir,
    kcl_akhir,
    dolomit_akhir,
  });

  return {
    input: { umur, luas, protas, jumlahPohon, n, p, k, mg },
    produksi,
    prodPerPohon,
    prod_n,
    prod_p,
    prod_k,
    prod_mg,
    bio_n,
    bio_p,
    bio_k,
    bio_mg,
    urea_awal,
    tsp_awal,
    kcl_awal,
    dolomit_awal,
    urea_akhir,
    tsp_akhir,
    kcl_akhir,
    dolomit_akhir,
    aplikasi1: {
      urea: urea_app1,
      tsp: tsp_app1,
      kcl: kcl_app1,
      dolomit: dolomit_app1,
    },
    aplikasi2: {
      urea: urea_app2,
      tsp: tsp_app2,
      kcl: kcl_app2,
      dolomit: dolomit_app2,
    },
    recommendations,
  };
}