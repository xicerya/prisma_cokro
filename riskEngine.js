// riskEngine.js
// Mesin analisis risiko yang memakai rules.js + integrasi LegalEngine (legalCheck.js)

const RiskEngine = (() => {
  function categorizeRisk(score) {
    if (score <= 6) return "Rendah";
    if (score <= 15) return "Sedang";
    return "Tinggi";
  }

  function deriveDataCategoriesFromDataType(dataType) {
    const t = (dataType || "").toLowerCase();
    if (t === "identitas") {
      return ["ktp", "sim"];
    }
    if (t === "biometrik") {
      return ["wajah", "suara"];
    }
    if (t === "umum") {
      return ["nama"];
    }
    return [];
  }

  function analyze(params) {
    // 1. Likelihood & Impact awal dari rules.js
    let autoInfoRaw = {};
    if (typeof RiskRules !== "undefined" && RiskRules.inferBaseLikelihoodImpact) {
      autoInfoRaw = RiskRules.inferBaseLikelihoodImpact(params) || {};
    }

    const autoInfo = {
      likelihood:
        typeof autoInfoRaw.likelihood === "number" ? autoInfoRaw.likelihood : 3,
      impact:
        typeof autoInfoRaw.impact === "number" ? autoInfoRaw.impact : 3,
      reasons: Array.isArray(autoInfoRaw.reasons) ? autoInfoRaw.reasons : []
    };

    const baseLikelihood = autoInfo.likelihood;
    const baseImpact = autoInfo.impact;
    const baseRiskScore = baseLikelihood * baseImpact;
    const baseRiskLevel = categorizeRisk(baseRiskScore); // Rendah / Sedang / Tinggi

    // 2. Evaluasi kepatuhan UU PDP & NIST
    let pdpResults = [];
    let nistResults = [];
    let recommendations = [];

    if (typeof RiskRules !== "undefined") {
      if (typeof RiskRules.evaluatePDP === "function") {
        pdpResults = RiskRules.evaluatePDP(params) || [];
      }
      if (typeof RiskRules.evaluateNIST === "function") {
        nistResults = RiskRules.evaluateNIST(params) || [];
      }
      if (typeof RiskRules.generateRecommendations === "function") {
        recommendations =
          RiskRules.generateRecommendations({
            params,
            pdpResults,
            nistResults,
            riskScore: baseRiskScore,
            riskLevel: baseRiskLevel
          }) || [];
      }
    }

    // 3. Integrasi dengan LegalEngine
    let legalContext = null;
    let finalRiskLevel = baseRiskLevel;
    let legalOverride = null;

    if (
      typeof window !== "undefined" &&
      window.LegalEngine &&
      typeof window.LegalEngine.evaluateLegalContext === "function"
    ) {
      const platformType = params.platformType || "lainnya";
      const serviceName = params.serviceName || "";

      const dataCategories =
        Array.isArray(params.dataCategories) && params.dataCategories.length > 0
          ? params.dataCategories
          : deriveDataCategoriesFromDataType(params.dataType);

      const matrixRiskLevel =
        baseRiskLevel === "Tinggi"
          ? "High"
          : baseRiskLevel === "Sedang"
          ? "Medium"
          : "Low";

      legalContext = window.LegalEngine.evaluateLegalContext({
        platformType,
        serviceName,
        dataCategories,
        matrixRiskLevel
      });

      if (
        legalContext &&
        legalContext.finalRisk &&
        legalContext.finalRisk.finalRiskLevel
      ) {
        const fr = legalContext.finalRisk.finalRiskLevel;
        finalRiskLevel =
          fr === "High" ? "Tinggi" : fr === "Medium" ? "Sedang" : "Rendah";
        legalOverride = legalContext.finalRisk.overrideReason || null;
      }
    }

    // 4. APPLY OVERRIDE 1×1 UNTUK LEGAL + PEMERINTAH
    // ------------------------------------------------
    // Kalau layanan LEGAL & diakui lembaga pemerintah (OJK / Komdigi PSE),
    // termasuk e-wallet yang masuk registry tersebut, kita anggap residual risk:
    // Likelihood = 1, Impact = 1 → kotak hijau 1×1 di matrix.
    let effectiveLikelihood = baseLikelihood;
    let effectiveImpact = baseImpact;

    if (
      legalContext &&
      legalContext.finalRisk &&
      legalContext.finalRisk.fromGovernmentRegistry
    ) {
      effectiveLikelihood = 1;
      effectiveImpact = 1;
    }

    const effectiveRiskScore = effectiveLikelihood * effectiveImpact;

    return {
      likelihood: effectiveLikelihood,
      impact: effectiveImpact,
      riskScore: effectiveRiskScore,
      riskLevel: finalRiskLevel, // sudah mempertimbangkan legalitas
      autoInfo,
      pdpResults,
      nistResults,
      recommendations,
      legalContext,
      legalOverride
    };
  }

  return {
    analyze
  };
})();
