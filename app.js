// app.js
// Interaksi UI untuk Dashboard Analisis Risiko Privasi

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("risk-form");
  const resetBtn = document.getElementById("reset-btn");
  const summaryContent = document.getElementById("summary-content");
  const matrixContainer = document.getElementById("risk-matrix");
  const pdpContainer = document.getElementById("pdp-results");
  const nistContainer = document.getElementById("nist-results");
  const recContainer = document.getElementById("recommendations");

  buildEmptyMatrix();

  if (!form) {
    console.error("Form dengan id 'risk-form' tidak ditemukan.");
    return;
  }

  // 🟢 Filter otomatis layanan berdasarkan platformType
  const platformSelect = document.getElementById("platformType");
  const serviceSelect = document.getElementById("serviceName");

  if (platformSelect && serviceSelect) {
    const optgroups = serviceSelect.querySelectorAll("optgroup");

    function filterServiceOptions() {
      const platform = (platformSelect.value || "").toLowerCase();

      // Tampilkan semua dulu
      optgroups.forEach((g) => {
        g.hidden = false;
      });

      // Kalau tidak ada platform / lainnya → biarkan semua muncul
      if (!platform || platform === "lainnya") {
        return;
      }

      optgroups.forEach((g) => {
        const label = (g.label || "").toLowerCase();
        let match = false;

        if (platform === "bank" && label.includes("bank (ojk)")) {
          match = true;
        } else if (
          (platform === "ecommerce" || platform === "e-commerce") &&
          label.includes("pse / e-commerce")
        ) {
          match = true;
        } else if (platform === "fintech" && label.includes("fintech")) {
          match = true;
        } else if (
          (platform === "biometric" || platform === "biometrik") &&
          label.includes("biometrik / verifikasi internasional")
        ) {
          match = true;
        }

        g.hidden = !match;
      });

      // reset pilihan setiap kali ganti platform
      serviceSelect.value = "";
    }

    platformSelect.addEventListener("change", filterServiceOptions);
    // jalan sekali di awal (kalau user belum memilih apa-apa, semua tetap muncul)
    filterServiceOptions();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const params = collectParams();
    const result = RiskEngine.analyze(params);

    renderSummary(params, result);
    renderMatrix(result);
    renderPDP(result.pdpResults);
    renderNIST(result.nistResults);
    renderRecommendations(result.recommendations);
  });

  resetBtn.addEventListener("click", () => {
    setTimeout(() => {
      buildEmptyMatrix();
      summaryContent.classList.add("placeholder");
      summaryContent.innerHTML =
        'Isi formulir di atas kemudian klik <strong>Hitung Risiko</strong> untuk melihat hasil analisis.';
      pdpContainer.classList.add("placeholder");
      pdpContainer.innerHTML =
        "Belum ada data. Jalankan analisis terlebih dahulu.";
      nistContainer.classList.add("placeholder");
      nistContainer.innerHTML =
        "Belum ada data. Jalankan analisis terlebih dahulu.";
      recContainer.classList.add("placeholder");
      recContainer.innerHTML =
        "Belum ada rekomendasi. Jalankan analisis terlebih dahulu.";
    }, 0);
  });

  // ======================
  // KUMPUL PARAMETER FORM
  // ======================
  function collectParams() {
    const scenarioName = document.getElementById("scenarioName").value.trim();

    const platformType = document.getElementById("platformType").value;
    const serviceName = document.getElementById("serviceName").value;

    const dataType = document.getElementById("dataType").value;
    const processingActivity =
      document.getElementById("processingActivity").value;
    const processingPurpose = document
      .getElementById("processingPurpose")
      .value.trim();

    const encryption = document.getElementById("encryption").value;
    const accessControl = document.getElementById("accessControl").value;
    const authMethod = document.getElementById("authMethod").value;
    const consentType = document.getElementById("consentType").value;
    const privacyPolicy = document.getElementById("privacyPolicy").value;
    const incidentResponsePlan =
      document.getElementById("incidentResponsePlan").value;
    const detectSystem = document.getElementById("detectSystem").value;
    const backupPolicy = document.getElementById("backupPolicy").value;

    const thirdParty =
      (document.querySelector('input[name="thirdParty"]:checked') || {})
        .value || "no";

    const purposeSpecified =
      (document.querySelector('input[name="purposeSpecified"]:checked') || {})
        .value || "no";

    const dataCategories = [];
    document
      .querySelectorAll('input[name="legalDataCategory"]:checked')
      .forEach((el) => dataCategories.push(el.value));

    return {
      scenarioName,
      platformType,
      serviceName,
      dataType,
      processingActivity,
      processingPurpose,
      thirdParty,
      encryption,
      accessControl,
      authMethod,
      purposeSpecified,
      consentType,
      privacyPolicy,
      incidentResponsePlan,
      detectSystem,
      backupPolicy,
      dataCategories
    };
  }

  // ======================
  // RINGKASAN & HASIL
  // ======================
  function renderSummary(params, result) {
    summaryContent.classList.remove("placeholder");
    const badgeClass =
      result.riskLevel === "Tinggi"
        ? "high"
        : result.riskLevel === "Sedang"
        ? "medium"
        : "low";

    const scenarioTitle =
      params.scenarioName && params.scenarioName.length > 0
        ? params.scenarioName
        : "Skenario tanpa nama";

    const autoBlock = result.autoInfo
      ? `<p style="margin-top:0.5rem;font-size:0.8rem;color:#9ca3af;">
            Nilai Likelihood &amp; Impact ditentukan otomatis berdasarkan rule engine:
            ${result.autoInfo.reasons.join(" ")}
         </p>`
      : `<p style="margin-top:0.5rem;font-size:0.8rem;color:#9ca3af;">
            Nilai Likelihood &amp; Impact menggunakan input manual pengguna.
         </p>`;

    const legalBlock =
      result.legalContext && result.legalContext.legalStatus
        ? `<p style="margin-top:0.5rem;font-size:0.8rem;color:#6ee7b7;">
             Legalitas: ${
               result.legalContext.legalStatus.isLegal
                 ? "LEGAL"
                 : "PERLU KEHATI-HATIAN"
             }${
             result.legalContext.legalStatus.registry
               ? " – " +
                 escapeHtml(result.legalContext.legalStatus.registry.label)
               : ""
           }.<br/>
             ${escapeHtml(
               result.legalContext.legalStatus.reason || ""
             )}
           </p>`
        : "";

    summaryContent.innerHTML = `
      <p style="margin-bottom:0.75rem;">
        Hasil analisis untuk: <strong>${escapeHtml(scenarioTitle)}</strong>
      </p>
      <div class="summary-grid">
        <div class="summary-item">
          <h3>Likelihood</h3>
          <p>${result.likelihood}</p>
        </div>
        <div class="summary-item">
          <h3>Impact</h3>
          <p>${result.impact}</p>
        </div>
        <div class="summary-item">
          <h3>Risk Score</h3>
          <p>${result.riskScore}</p>
        </div>
      </div>
      <p style="margin-bottom:0.25rem;">
        Level Risiko:
        <span class="badge ${badgeClass}">${result.riskLevel}</span>
      </p>
      ${autoBlock}
      ${legalBlock}
    `;
  }

  function buildEmptyMatrix() {
    matrixContainer.innerHTML = "";

    matrixContainer.appendChild(createCell(" ", "label"));
    for (let l = 1; l <= 5; l++) {
      matrixContainer.appendChild(createCell(String(l), "label axis"));
    }

    for (let i = 5; i >= 1; i--) {
      matrixContainer.appendChild(createCell(String(i), "label axis"));
      for (let l = 1; l <= 5; l++) {
        const levelClass =
          i * l <= 6 ? "low" : i * l <= 15 ? "medium" : "high";
        const cell = createCell("", `matrix ${levelClass}`);
        cell.dataset.likelihood = String(l);
        cell.dataset.impact = String(i);
        matrixContainer.appendChild(cell);
      }
    }
  }

  function renderMatrix(result) {
    buildEmptyMatrix();
    const cells = matrixContainer.querySelectorAll(".matrix");
    cells.forEach((cell) => {
      const l = parseInt(cell.dataset.likelihood, 10);
      const i = parseInt(cell.dataset.impact, 10);
      if (l === result.likelihood && i === result.impact) {
        cell.classList.add("active");
      }
    });
  }

  function renderPDP(pdpResults) {
    pdpContainer.classList.remove("placeholder");
    if (!pdpResults || pdpResults.length === 0) {
      pdpContainer.textContent = "Tidak ada hasil evaluasi.";
      return;
    }

    let html = `
      <table>
        <thead>
          <tr>
            <th>Aspek</th>
            <th>Status</th>
            <th>Pasal/Ayat Terkait</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const r of pdpResults) {
      html += `
        <tr>
          <td>${escapeHtml(r.aspect)}</td>
          <td>
            <span class="status-pill ${r.code}">
              ${escapeHtml(r.status)}
            </span>
          </td>
          <td>${escapeHtml(r.legalRef || "-")}</td>
          <td>${escapeHtml(r.note)}</td>
        </tr>
      `;
    }

    html += "</tbody></table>";
    pdpContainer.innerHTML = html;
  }

  function renderNIST(nistResults) {
    nistContainer.classList.remove("placeholder");
    if (!nistResults || nistResults.length === 0) {
      nistContainer.textContent = "Tidak ada hasil pemetaan.";
      return;
    }

    let html =
      '<table><thead><tr><th>Fungsi</th><th>Level</th><th>Keterangan</th></tr></thead><tbody>';
    for (const r of nistResults) {
      const levelCode =
        r.level === "Kuat" || r.level === "Sedang–Kuat"
          ? "good"
          : r.level === "Sedang"
          ? "ok"
          : "bad";
      html += `
        <tr>
          <td>${escapeHtml(r.function)}</td>
          <td><span class="status-pill ${levelCode}">${escapeHtml(
        r.level
      )}</span></td>
          <td>${escapeHtml(r.note)}</td>
        </tr>
      `;
    }
    html += "</tbody></table>";
    nistContainer.innerHTML = html;
  }

  function renderRecommendations(recs) {
    recContainer.classList.remove("placeholder");
    if (!recs || recs.length === 0) {
      recContainer.textContent =
        "Tidak ada rekomendasi khusus untuk skenario ini.";
      return;
    }

    let html = '<ul class="recommendation-list">';
    for (const r of recs) {
      html += `<li>${escapeHtml(r)}</li>`;
    }
    html += "</ul>";
    recContainer.innerHTML = html;
  }

  function createCell(text, extraClass) {
    const div = document.createElement("div");
    div.className = "matrix-cell " + (extraClass || "");
    if (text) {
      div.textContent = text;
    }
    return div;
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
