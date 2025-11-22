// rules.js
// Kumpulan fungsi rule-based untuk analisis risiko privasi

const RiskRules = (() => {
  /**
   * Infer base Likelihood & Impact jika mode otomatis dipilih.
   * Nilai awal = 3, kemudian disesuaikan oleh aturan.
   */
  function inferBaseLikelihoodImpact(params) {
    let L = 3;
    let I = 3;
    const reasons = [];

    // Sensitivitas jenis data
    switch (params.dataType) {
      case "biometrik":
      case "keuangan":
        I += 2;
        reasons.push("Data sensitif (biometrik/keuangan) meningkatkan dampak.");
        break;
      case "identitas":
        I += 1;
        reasons.push("Data identitas meningkatkan dampak secara moderat.");
        break;
      case "lokasi":
      case "perilaku":
        I += 0;
        reasons.push("Data perilaku/lokasi berdampak sedang tergantung konteks.");
        break;
      default:
        reasons.push("Jenis data umum: dampak diasumsikan sedang.");
    }

    // Aktivitas pemrosesan
    if (params.processingActivity === "sharing") {
      L += 1;
      I += 1;
      reasons.push("Aktivitas sharing ke pihak lain meningkatkan likelihood dan impact.");
    } else if (params.processingActivity === "storage") {
      L += 0;
      I += 1;
      reasons.push("Penyimpanan jangka panjang meningkatkan dampak jika terjadi kebocoran.");
    } else if (params.processingActivity === "collection") {
      L += 0;
      I += 0;
      reasons.push("Pengumpulan awal: risiko bergantung pada penyimpanan dan sharing.");
    } else if (params.processingActivity === "transmission") {
      L += 1;
      reasons.push("Pengiriman data tanpa kontrol kuat meningkatkan likelihood.");
    } else if (params.processingActivity === "deletion") {
      I -= 1;
      reasons.push("Fokus pada penghapusan dapat menurunkan dampak residu data.");
    }

    // Keterlibatan pihak ketiga
    if (params.thirdParty === "yes") {
      L += 1;
      I += 1;
      reasons.push("Keterlibatan pihak ketiga menambah permukaan serangan dan ketidakpastian kontrol.");
    }

    // Enkripsi
    if (params.encryption === "none") {
      L += 1;
      I += 1;
      reasons.push("Tidak ada enkripsi menambah kemungkinan dan dampak kebocoran.");
    } else if (params.encryption === "both") {
      L -= 1;
      I -= 1;
      reasons.push("Enkripsi at rest & in transit menurunkan likelihood dan impact.");
    }

    // Kontrol akses
    if (params.accessControl === "none") {
      L += 1;
      reasons.push("Tidak ada kontrol akses formal meningkatkan likelihood akses tidak sah.");
    } else if (params.accessControl === "role_based") {
      L -= 1;
      reasons.push("Kontrol akses berbasis peran menurunkan likelihood akses tidak sah.");
    }

    // Clamping nilai 1–5
    L = Math.max(1, Math.min(5, L));
    I = Math.max(1, Math.min(5, I));

    return {
      likelihood: L,
      impact: I,
      reasons,
    };
  }

  /**
   * Evaluasi kepatuhan terhadap aspek utama UU PDP 2022.
   * Mengembalikan array {aspect, status, note}
   */
  function evaluatePDP(params) {
    const results = [];

    // Purpose Limitation
    if (params.purposeSpecified === "yes") {
      results.push({
        aspect: "Purpose Limitation",
        status: "Patuh",
        code: "good",
        note: "Tujuan pemrosesan data telah dijelaskan secara eksplisit.",
      });
    } else {
      results.push({
        aspect: "Purpose Limitation",
        status: "Tidak Patuh",
        code: "bad",
        note: "Tujuan pemrosesan data belum dijelaskan secara jelas kepada subjek data.",
      });
    }

    // Consent
    if (params.consentType === "explicit") {
      results.push({
        aspect: "Consent",
        status: "Patuh",
        code: "good",
        note: "Persetujuan eksplisit digunakan, sesuai praktik terbaik untuk data pribadi.",
      });
    } else if (params.consentType === "implicit") {
      let status = "Sebagian Patuh";
      let code = "ok";
      let note =
        "Consent implicit masih dapat diterima untuk data non-sensitif, namun kurang ideal.";
      if (params.dataType === "biometrik" || params.dataType === "keuangan") {
        status = "Tidak Patuh";
        code = "bad";
        note =
          "Data sensitif (biometrik/keuangan) sebaiknya menggunakan consent eksplisit.";
      }
      results.push({
        aspect: "Consent",
        status,
        code,
        note,
      });
    } else {
      results.push({
        aspect: "Consent",
        status: "Tidak Patuh",
        code: "bad",
        note: "Tidak ada mekanisme consent yang jelas.",
      });
    }

    // Security Measures
    if (params.encryption === "both" && params.accessControl === "role_based") {
      results.push({
        aspect: "Security Measures",
        status: "Patuh",
        code: "good",
        note: "Enkripsi dan kontrol akses sudah diterapkan dengan baik.",
      });
    } else if (params.encryption === "none" || params.accessControl === "none") {
      results.push({
        aspect: "Security Measures",
        status: "Tidak Patuh",
        code: "bad",
        note:
          "Enkripsi dan/atau kontrol akses belum memadai untuk melindungi data pribadi.",
      });
    } else {
      results.push({
        aspect: "Security Measures",
        status: "Sebagian Patuh",
        code: "ok",
        note: "Sebagian kontrol keamanan telah diterapkan namun masih dapat ditingkatkan.",
      });
    }

    // Third Party Processing
    if (params.thirdParty === "yes") {
      results.push({
        aspect: "Third Party Processing",
        status: "Sebagian Patuh",
        code: "ok",
        note:
          "Keterlibatan pihak ketiga memerlukan perjanjian pemrosesan data dan due diligence yang jelas.",
      });
    } else {
      results.push({
        aspect: "Third Party Processing",
        status: "Patuh",
        code: "good",
        note:
          "Pemrosesan data dilakukan tanpa melibatkan pihak ketiga, sehingga risiko eksternal berkurang.",
      });
    }

    // Incident Response & Notification
    if (params.incidentResponsePlan === "tested_regularly") {
      results.push({
        aspect: "Incident Response",
        status: "Patuh",
        code: "good",
        note: "Rencana respons insiden tersedia dan diuji secara berkala.",
      });
    } else if (params.incidentResponsePlan === "documented") {
      results.push({
        aspect: "Incident Response",
        status: "Sebagian Patuh",
        code: "ok",
        note: "Rencana respons insiden tersedia namun belum diuji secara rutin.",
      });
    } else {
      results.push({
        aspect: "Incident Response",
        status: "Tidak Patuh",
        code: "bad",
        note:
          "Belum terdapat rencana respons insiden yang jelas untuk kebocoran data pribadi.",
      });
    }

    return results;
  }

  /**
   * Pemetaan heuristik ke fungsi NIST CSF 2.0
   */
  function evaluateNIST(params) {
    const results = [];

    // Govern
    results.push({
      function: "GV (Govern)",
      level:
        params.purposeSpecified === "yes" ? "Sedang–Kuat" : "Lemah",
      note:
        params.purposeSpecified === "yes"
          ? "Ada upaya tata kelola melalui penjelasan tujuan pemrosesan."
          : "Belum ada kejelasan tata kelola tujuan pemrosesan data.",
    });

    // Identify
    results.push({
      function: "ID (Identify)",
      level: "Sedang",
      note:
        "Identifikasi aset dan jenis data diasumsikan dilakukan secara dasar melalui pemetaan jenis data.",
    });

    // Protect
    let protectLevel = "Sedang";
    if (params.encryption === "none" || params.accessControl === "none") {
      protectLevel = "Lemah";
    } else if (
      params.encryption === "both" &&
      params.accessControl === "role_based"
    ) {
      protectLevel = "Kuat";
    }
    results.push({
      function: "PR (Protect)",
      level: protectLevel,
      note: "Tingkat perlindungan bergantung pada enkripsi dan kontrol akses.",
    });

    // Detect
    results.push({
      function: "DE (Detect)",
      level: "Lemah",
      note:
        "Aspek deteksi tidak dimodelkan secara eksplisit dalam parameter ini dan diasumsikan masih lemah.",
    });

    // Respond
    let respondLevel = "Lemah";
    if (params.incidentResponsePlan === "documented") {
      respondLevel = "Sedang";
    } else if (params.incidentResponsePlan === "tested_regularly") {
      respondLevel = "Kuat";
    }
    results.push({
      function: "RS (Respond)",
      level: respondLevel,
      note:
        "Kesiapan respons insiden bergantung pada ketersediaan dan pengujian rencana respons.",
    });

    // Recover
    results.push({
      function: "RC (Recover)",
      level: "Sedang",
      note:
        "Kemampuan pemulihan diasumsikan sedang; dapat diperjelas dengan kebijakan backup & pemulihan.",
    });

    return results;
  }

  /**
   * Menghasilkan rekomendasi berbasis kondisi risiko & kepatuhan.
   */
  function generateRecommendations(context) {
    const { params, riskScore, riskLevel, pdpResults, nistResults } = context;
    const recs = [];

    if (riskLevel === "Tinggi") {
      recs.push(
        "Prioritaskan skenario ini sebagai risiko tinggi dan lakukan mitigasi dalam jangka pendek."
      );
    } else if (riskLevel === "Sedang") {
      recs.push(
        "Kelola risiko sedang dengan menetapkan kontrol tambahan dan pemantauan berkala."
      );
    } else {
      recs.push(
        "Risiko berada pada kategori rendah, namun tetap perlu dikaji ulang secara periodik."
      );
    }

    if (params.encryption === "none") {
      recs.push(
        "Terapkan enkripsi minimal saat data disimpan (at rest) dan dikirim (in transit) untuk mencegah kebocoran."
      );
    }

    if (params.accessControl === "none") {
      recs.push(
        "Implementasikan kontrol akses formal, misalnya role-based access control (RBAC)."
      );
    }

    if (params.dataType === "biometrik" || params.dataType === "keuangan") {
      if (params.consentType !== "explicit") {
        recs.push(
          "Gunakan mekanisme consent eksplisit untuk data sensitif seperti biometrik atau keuangan."
        );
      }
    }

    if (params.thirdParty === "yes") {
      recs.push(
        "Pastikan terdapat perjanjian pemrosesan data dengan pihak ketiga dan lakukan due diligence keamanan."
      );
    }

    const incidentAspect = pdpResults.find(
      (r) => r.aspect === "Incident Response"
    );
    if (incidentAspect && incidentAspect.status === "Tidak Patuh") {
      recs.push(
        "Rancang dan dokumentasikan prosedur respons insiden untuk kebocoran data pribadi, termasuk notifikasi kepada subjek data dan otoritas."
      );
    }

    const protectFunc = nistResults.find((n) => n.function.startsWith("PR"));
    if (protectFunc && protectFunc.level === "Lemah") {
      recs.push(
        "Perkuat fungsi Protect (NIST CSF) melalui peningkatan hardening sistem, kontrol akses, dan perlindungan data."
      );
    }

    return recs;
  }

  return {
    inferBaseLikelihoodImpact,
    evaluatePDP,
    evaluateNIST,
    generateRecommendations,
  };
})();
