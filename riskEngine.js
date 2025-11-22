// riskEngine.js
// Menggabungkan aturan ke dalam satu fungsi analisis risiko

const RiskEngine = (() => {
  function categorizeRisk(score) {
    if (score <= 6) return "Rendah";
    if (score <= 15) return "Sedang";
    return "Tinggi";
  }

  function analyze(params) {
    let likelihood, impact, autoInfo = null;

    if (params.modeLI === "manual" && params.likelihood && params.impact) {
      likelihood = parseInt(params.likelihood, 10);
      impact = parseInt(params.impact, 10);
    } else {
      autoInfo = RiskRules.inferBaseLikelihoodImpact(params);
      likelihood = autoInfo.likelihood;
      impact = autoInfo.impact;
    }

    likelihood = Math.max(1, Math.min(5, likelihood));
    impact = Math.max(1, Math.min(5, impact));

    const riskScore = likelihood * impact;
    const riskLevel = categorizeRisk(riskScore);

    const pdpResults = RiskRules.evaluatePDP(params);
    const nistResults = RiskRules.evaluateNIST(params);

    const recommendations = RiskRules.generateRecommendations({
      params,
      riskScore,
      riskLevel,
      pdpResults,
      nistResults,
    });

    return {
      likelihood,
      impact,
      riskScore,
      riskLevel,
      autoInfo,
      pdpResults,
      nistResults,
      recommendations,
    };
  }

  return {
    analyze,
  };
})();
