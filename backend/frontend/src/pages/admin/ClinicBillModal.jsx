import React, { useRef } from "react";
import { X, Printer, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const ClinicBillModal = ({ cart, total, onClose, patientName, billDate }) => {
  const billRef = useRef();

  const currentDate = billDate || new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  // ─── Print via hidden iframe (keeps React app alive) ────────────────────
  const handlePrint = () => {
    const billHTML = billRef.current.outerHTML;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <title>NIMI PRIVATE LIMITED - Bill</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body { width: 794px; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>${billHTML}</body>
</html>`);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  // ─── Download as PDF using html2canvas + jsPDF ───────────────────────────
  const handleDownload = async () => {
    const element = billRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`NIMI_Bill_${currentDate.replace(/\//g, "-")}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
      {/* Action Bar */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-[210]">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 text-sm font-bold rounded-lg shadow-lg hover:bg-slate-50 transition-all border border-slate-200"
        >
          <Printer size={16} /> Print
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-slate-800 transition-all"
        >
          <Download size={16} /> Download PDF
        </button>
        <button
          onClick={onClose}
          className="p-2.5 bg-white text-slate-600 rounded-lg shadow-lg hover:bg-red-50 hover:text-red-600 transition-all border border-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      {/* ─── A4 Bill / Letterhead ───────────────────────────────────────────── */}
      <div
        ref={billRef}
        style={{
          width: "794px",
          minHeight: "1123px",
          backgroundColor: "#ffffff",
          fontFamily: "Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          marginTop: "60px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ══════════════════════ HEADER ══════════════════════ */}
        <div style={{ padding: "18px 24px 0 24px", borderBottom: "1px solid #ddd" }}>
          {/* Top Row: Logo + Company Name */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
            {/* Company Logo SVG */}
            <svg width="80" height="80" viewBox="0 0 100 100">
              {/* Outer ring */}
              <circle cx="50" cy="50" r="48" fill="none" stroke="#1B5899" strokeWidth="3" />
              {/* Dots */}
              <circle cx="8" cy="50" r="4" fill="#4CAF50" />
              <circle cx="92" cy="50" r="4" fill="#4CAF50" />
              <circle cx="50" cy="8" r="3" fill="#4CAF50" />
              {/* Inner circle */}
              <circle cx="50" cy="50" r="36" fill="#1B5899" />
              {/* Abstract symbol */}
              <path d="M36 30 Q36 22 44 22 Q50 22 50 28 Q50 22 56 22 Q64 22 64 30 Q64 36 60 40 L58 55 Q57 60 52 60 Q50 60 50 55 Q50 60 48 60 Q43 60 42 55 L40 40 Q36 36 36 30Z" fill="white" />
              {/* "NIMI" text */}
              <text x="50" y="80" textAnchor="middle" fill="#1B5899" fontSize="13" fontWeight="bold" fontFamily="Arial">NIMI</text>
            </svg>

            <div style={{ flex: 1 }}>
              {/* Company Name */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "0px" }}>
                <span style={{ fontSize: "28px", fontWeight: "900", color: "#1B5899", fontFamily: "Arial", letterSpacing: "-0.5px" }}>NIMI PRIVATE LIMITED</span>
              </div>
              <div style={{ fontSize: "11px", color: "#555", letterSpacing: "1.5px", fontWeight: "600", marginTop: "2px" }}>
                Business Management Platform
              </div>
            </div>
          </div>

          {/* Signatory Blocks */}
          <div style={{ display: "flex", justifyContent: "space-around", paddingBottom: "12px", borderBottom: "1px solid #ddd", gap: "20px" }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "#7B1010" }}>NIMI PRIVATE LIMITED Authorized Signatory</div>
              <div style={{ fontSize: "10px", color: "#444", marginTop: "3px", lineHeight: "1.6" }}>
                Authorized Representative<br />
                NIMI PRIVATE LIMITED<br />
                +91-XXXXXXXXXX
              </div>
            </div>

            {/* Center vertical divider */}
            <div style={{ width: "1px", backgroundColor: "#ddd", alignSelf: "stretch" }} />

            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "#7B1010" }}>NIMI PRIVATE LIMITED Authorized Signatory</div>
              <div style={{ fontSize: "10px", color: "#444", marginTop: "3px", lineHeight: "1.6" }}>
                Authorized Representative<br />
                NIMI PRIVATE LIMITED<br />
                +91-XXXXXXXXXX
              </div>
            </div>
          </div>

          {/* Maroon Strip */}
          <div style={{
            backgroundColor: "#7B1010",
            margin: "0 -24px",
            padding: "8px 24px",
            textAlign: "center",
            color: "#FFD700",
            fontSize: "12px",
            fontWeight: "800",
            letterSpacing: "0.5px"
          }}>
            Business Hours: 9:00 AM to 6:00 PM
          </div>
        </div>

        {/* ══════════════════════ BODY / BILL CONTENT ══════════════════════ */}
        <div style={{ flex: 1, padding: "20px 32px", position: "relative" }}>

          {/* Watermark SVG — centered in the body */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -55%)",
            opacity: 0.12, pointerEvents: "none", zIndex: 0
          }}>
            <svg width="320" height="380" viewBox="0 0 320 380">
              {/* Orange/Beige curved shape (left) */}
              <path d="M80 20 Q40 40 30 100 Q20 160 40 200 Q55 230 70 260 Q85 300 90 330 Q95 360 110 360 Q120 360 125 330 Q130 310 135 290 Q140 270 155 270 Q170 270 175 290 Q180 310 185 330 Q190 360 200 360 Q215 360 220 330 Q225 300 240 260 Q255 230 270 200 Q290 160 280 100 Q270 40 230 20 Q200 5 160 5 Q120 5 80 20Z"
                fill="none" stroke="#E8C88A" strokeWidth="18" strokeLinecap="round" />
              {/* Mint green curved overlay (right portion) */}
              <path d="M155 270 Q140 270 135 290 Q130 310 125 330 Q120 360 110 360 Q95 360 90 330 Q85 300 70 260 Q55 230 40 200 Q20 160 30 100 Q40 60 60 35"
                fill="none" stroke="#7DC9A8" strokeWidth="18" strokeLinecap="round" />
            </svg>
          </div>

          {/* Rx + Date line */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", position: "relative", zIndex: 1 }}>
            <div>
              <span style={{ fontSize: "24px", fontWeight: "900", fontFamily: "Times New Roman, serif", fontStyle: "italic" }}>R</span>
              <sub style={{ fontSize: "14px", fontWeight: "900" }}>x</sub>
            </div>
            <div style={{ fontSize: "11px", color: "#333", fontWeight: "600" }}>
              Date : <span style={{ borderBottom: "1px dotted #555", paddingRight: "60px", marginLeft: "4px" }}>{currentDate}</span>
            </div>
          </div>

          {/* Client Name */}
          <div style={{ marginBottom: "20px", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#444", minWidth: "90px" }}>Client Name:</span>
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#111", borderBottom: "1px solid #333", flex: 1, paddingBottom: "2px" }}>
                {patientName || "...................................................................................."}
              </span>
            </div>
          </div>

          {/* Bill Title */}
          <div style={{ textAlign: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
            <div style={{
              display: "inline-block",
              backgroundColor: "#7B1010",
              color: "white",
              fontSize: "11px",
              fontWeight: "800",
              padding: "5px 24px",
              borderRadius: "2px",
              letterSpacing: "2px",
              textTransform: "uppercase"
            }}>
              Service Invoice
            </div>
          </div>

          {/* Services Table */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ backgroundColor: "#7B1010", color: "white" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "800", letterSpacing: "0.5px", width: "40px" }}>S.No</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: "800", letterSpacing: "0.5px" }}>Service / Item</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: "800", letterSpacing: "0.5px", width: "60px" }}>Qty</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "800", letterSpacing: "0.5px", width: "100px" }}>Unit Price (₹)</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: "800", letterSpacing: "0.5px", width: "110px" }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, idx) => (
                  <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? "#FAFAFA" : "#FFF5F5", borderBottom: "1px solid #EEE" }}>
                    <td style={{ padding: "8px 10px", color: "#555", fontWeight: "600" }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px", fontWeight: "700", color: "#222" }}>{item.title}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: "600", color: "#555" }}>{item.quantity}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "600", color: "#333" }}>{parseFloat(item.price).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "800", color: "#111" }}>{(parseFloat(item.price) * item.quantity).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#F0F0F0", borderTop: "2px solid #7B1010" }}>
                  <td colSpan="4" style={{ padding: "10px 10px", textAlign: "right", fontWeight: "900", fontSize: "12px", color: "#222", letterSpacing: "0.5px" }}>
                    TOTAL AMOUNT
                  </td>
                  <td style={{ padding: "10px 10px", textAlign: "right", fontWeight: "900", fontSize: "14px", color: "#7B1010" }}>
                    ₹{total.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr style={{ backgroundColor: "#7B1010" }}>
                  <td colSpan="5" style={{ padding: "8px 10px", textAlign: "right", color: "white", fontWeight: "700", fontSize: "11px" }}>
                    Amount in Words: {numberToWords(Math.round(total))} Rupees Only
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signature Block */}
          <div style={{ marginTop: "40px", display: "flex", justifyContent: "flex-end", position: "relative", zIndex: 1 }}>
            <div style={{ textAlign: "center", minWidth: "160px" }}>
              <div style={{ borderTop: "1px solid #555", paddingTop: "6px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#7B1010" }}>Authorized Signatory</div>
                <div style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>NIMI PRIVATE LIMITED</div>
              </div>
            </div>
          </div>

          {/* Note line */}
          <div style={{ marginTop: "20px", fontSize: "9px", color: "#888", textAlign: "center", borderTop: "1px dashed #DDD", paddingTop: "8px", position: "relative", zIndex: 1 }}>
            This is a computer-generated invoice. No signature required. • Fees once paid are non-refundable.
          </div>
        </div>

        {/* ══════════════════════ FOOTER ══════════════════════ */}
        <div style={{ position: "relative", marginTop: "auto" }}>
          {/* Horizontal line above footer */}
          <div style={{ borderTop: "1px solid #ccc", margin: "0 24px" }} />

          <div style={{ display: "flex", alignItems: "stretch", minHeight: "90px", position: "relative" }}>
            {/* Left maroon triangle block */}
            <div style={{
              backgroundColor: "#7B1010",
              padding: "16px 20px 16px 24px",
              minWidth: "180px",
              display: "flex",
              alignItems: "center",
              clipPath: "polygon(0 0, 85% 0, 100% 100%, 0 100%)",
              position: "relative",
            }}>
              {/* Green diagonal line accent */}
              <div style={{
                position: "absolute", top: 0, right: 0,
                width: "40px", height: "100%",
                background: "linear-gradient(to bottom-left, #4CAF50 0%, transparent 60%)",
                opacity: 0.8
              }} />
              <div style={{ color: "white", fontSize: "10px", fontWeight: "800", lineHeight: "1.6", position: "relative", zIndex: 1 }}>
                Business Hours<br />
                9:00 AM to 6:00 PM<br />
                Monday - Saturday
              </div>
            </div>

            {/* Right contact details */}
            <div style={{ flex: 1, padding: "14px 24px 14px 40px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "5px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "#333", fontWeight: "600" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#7B1010">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                NIMI PRIVATE LIMITED, Registered Office Address
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "#333", fontWeight: "600" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#7B1010">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                +91-XXXXXXXXXX &nbsp;&nbsp; +91-XXXXXXXXXX
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", color: "#333", fontWeight: "600" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#7B1010">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                info@nimipl.com
              </div>
            </div>
          </div>
        </div>
        {/* end bill */}
      </div>
    </div>
  );
};

// ─── Helper: Number to Words ─────────────────────────────────────────────────
function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  return convert(num);
}

export default ClinicBillModal;