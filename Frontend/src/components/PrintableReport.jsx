import React, { forwardRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

// Helper to format date strings to SurveyMonkey format: M/D/YYYY h:mm A
const formatSmDateTime = (dateVal) => {
  if (!dateVal || dateVal === "Undated") return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return dateVal;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
};

// Customized YAxis tick for Q2 (Feedback Received) matrix rows
const CustomizedYAxisTickQ2 = (props) => {
  const { x, y, payload } = props;
  const rawText = payload.value || "";

  // Normalize common concatenated phrases without spaces in survey exports
  const cleanText = rawText
    .replace(/members\s*oftheteam/gi, "members of the team")
    .replace(/confidentialityof\s*patients/gi, "confidentiality of patients")
    .replace(/appropriateresponsibility/gi, "appropriate responsibility")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

  const maxLineLength = 34;
  const words = cleanText.split(/\s+/);
  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const candidate = currentLine ? `${currentLine} ${words[i]}` : words[i];
    if (candidate.length > maxLineLength && currentLine) {
      lines.push(currentLine.trim());
      currentLine = words[i];
    } else {
      currentLine = candidate;
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  // Strictly limit to 3 lines maximum to prevent any vertical overlap
  if (lines.length > 3) {
    let third = lines[2];
    if (third.length > 28) {
      third = third.substring(0, 28).trim();
    }
    lines[2] = third.replace(/\.+$/, "") + "...";
    lines.length = 3;
  }

  const lineHeight = 11;
  const startY = -((lines.length - 1) * lineHeight) / 2;

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fill="#2d3748" fontSize="8.5" fontWeight="500">
        {lines.map((line, i) => (
          <tspan key={i} x={-8} dy={i === 0 ? startY + 3 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// Customized XAxis tick for Q4 (Overall Rating 1-10)
const CustomizedXAxisTickQ4 = (props) => {
  const { x, y, payload } = props;
  const val = String(payload.value || "");

  if (val.includes("1-") || val.includes("1 -") || val.toLowerCase().includes("very poor")) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor="middle" fill="#2d3748" fontSize="9.5" fontWeight="500">
          <tspan x={0} dy={11}>1- Very</tspan>
          <tspan x={0} dy={11}>Poor</tspan>
        </text>
      </g>
    );
  }

  if (val.includes("10") || val.toLowerCase().includes("extremely good")) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text textAnchor="middle" fill="#2d3748" fontSize="9.5" fontWeight="500">
          <tspan x={0} dy={11}>10 -</tspan>
          <tspan x={0} dy={11}>Extremely</tspan>
          <tspan x={0} dy={11}>good</tspan>
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={14} textAnchor="middle" fill="#2d3748" fontSize="10" fontWeight="500">
        {val}
      </text>
    </g>
  );
};

// Custom top label for Q4 bars (always shows count, even 0)
const CustomQ4BarLabel = (props) => {
  const { x, y, width, value } = props;
  const displayVal = value !== undefined && value !== null ? value : 0;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="#212529"
      textAnchor="middle"
      fontSize="10"
      fontWeight="700"
    >
      {displayVal}
    </text>
  );
};

// Custom centered label for Q2 horizontal bars (only average score)
const CustomQ2BarLabel = (props) => {
  const { x, y, width, height, value } = props;
  if (!value && value !== 0) return null;
  const numVal = parseFloat(value);
  const labelText = numVal.toFixed(2);

  const isInside = width >= 40;
  const textX = isInside ? x + width / 2 : x + width + 8;
  const textColor = isInside ? "#ffffff" : "#212529";
  const anchor = isInside ? "middle" : "start";

  return (
    <text
      x={textX}
      y={y + height / 2}
      fill={textColor}
      textAnchor={anchor}
      dominantBaseline="central"
      fontSize="11"
      fontWeight="700"
    >
      {labelText}
    </text>
  );
};

const PrintableReport = forwardRef(({ survey, data }, ref) => {
  if (!data || !data.details || !data.rollups || !data.bulk) {
    return null;
  }

  const surveyTitle =
    survey?.title ||
    data?.details?.title ||
    "Multisource Feedback Form (MSF)";

  const totalResponses =
    survey?.response_count ?? data?.details?.response_count ?? 0;

  // Extract rollups safely
  const getRollup = (questionIdx) => {
    return data.rollups.data[questionIdx]?.summary[0] || {};
  };

  // ── Q1: Feedback Givers Profile ──
  const q1Rollup = getRollup(0);
  const q1Choices = data.details.pages[0]?.questions[0]?.answers?.choices || [];
  
  // Color palette matching SurveyMonkey
  const smDotColors = [
    "#00bf6f", // Green
    "#3870b2", // Blue
    "#e69900", // Yellow / Amber
    "#45ddc6", // Teal
    "#e06d53", // Orange
    "#7e6088", // Purple
    "#6c757d", // Slate
    "#d63384", // Pink
    "#20c997", // Emerald
  ];

  // Q1 & Q5 Comments parsing from bulk responses
  const q1Id = data.details.pages[0]?.questions[0]?.id;
  const q5Id = data.details.pages[0]?.questions[4]?.id;

  const responses = data.bulk.data || [];
  const commentsQ1 = [];
  const commentsQ5 = [];

  responses.forEach((resp) => {
    // SurveyMonkey Analyze reports display the response submission timestamp (date_modified or date_created)
    const rawDate = resp.date_modified || resp.date_created;
    const formattedDate = formatSmDateTime(rawDate);

    const pages = resp.pages || [];
    if (pages.length > 0) {
      const qs = pages[0].questions || [];
      const q1Ans = qs.find((q) => q.id === q1Id);
      const q5Ans = qs.find((q) => q.id === q5Id);

      // Parse Q5 comments
      if (q5Ans && q5Ans.answers && q5Ans.answers[0]?.text) {
        const textVal = q5Ans.answers[0].text.trim();
        if (textVal) {
          commentsQ5.push({
            text: textVal,
            date: formattedDate,
            rawDate: rawDate,
          });
        }
      }

      // Parse Q1 Other
      if (q1Ans && q1Ans.answers) {
        const otherAns = q1Ans.answers.find(
          (a) =>
            a.text &&
            a.text.trim().toLowerCase() !== "other (please specify)"
        );
        if (otherAns && otherAns.text && otherAns.text.trim()) {
          commentsQ1.push({
            text: otherAns.text.trim(),
            date: formattedDate,
            rawDate: rawDate,
          });
        }
      }
    }
  });

  // Sort Q5 comments newest first
  commentsQ5.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
  // Sort Q1 other comments newest first
  commentsQ1.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

  // Process Q1 answer choices
  let processedQ1 = q1Choices
    .map((c) => {
      const stat = (q1Rollup.choices || []).find((r) => r.id === c.id);
      const count = stat ? stat.count : 0;
      const percentage =
        totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(2) : "0.00";
      return { name: c.text, count, percentage, isOther: false };
    })
    .filter((c) => c.count > 0);

  // If there are "Other" comments and "Other (please specify)" isn't already included
  const hasOtherInQ1 = processedQ1.some((c) =>
    c.name.toLowerCase().includes("other")
  );
  if (!hasOtherInQ1 && commentsQ1.length > 0) {
    const otherCount = commentsQ1.length;
    const otherPercentage =
      totalResponses > 0 ? ((otherCount / totalResponses) * 100).toFixed(2) : "0.00";
    processedQ1.push({
      name: "Other (please specify)",
      count: otherCount,
      percentage: otherPercentage,
      isOther: true,
    });
  }

  // ── Q2: Feedback Received (Matrix) ──
  const q2Rollup = getRollup(1);
  const q2Rows = data.details.pages[0]?.questions[1]?.answers?.rows || [];
  const processedQ2 = q2Rows.map((row) => {
    const stat = (q2Rollup.rows || []).find((r) => r.id === row.id);
    const textRaw = row.text.replace(/<[^>]+>/g, "").trim();
    return {
      name: textRaw,
      average: stat && stat.stats ? parseFloat(stat.stats.mean.toFixed(2)) : 0,
    };
  });

  // ── Q3: Honesty and Integrity (Yes/No) ──
  const q3Rollup = getRollup(2);
  const q3Choices = data.details.pages[0]?.questions[2]?.answers?.choices || [];
  const processedQ3 = q3Choices.map((c) => {
    const stat = (q3Rollup.choices || []).find((r) => r.id === c.id);
    const count = stat ? stat.count : 0;
    const percentage =
      totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(2) : "0.00";
    return { name: c.text, count, percentage };
  });

  // ── Q4: Overall Rating (1-10) ──
  const q4Rollup = getRollup(3);
  const q4Choices = data.details.pages[0]?.questions[3]?.answers?.choices || [];
  const processedQ4 = q4Choices.map((c) => {
    const stat = (q4Rollup.choices || []).find((r) => r.id === c.id);
    return {
      name: c.text,
      count: stat ? stat.count : 0,
    };
  });

  // SurveyMonkey colors for Q4 1-10 bars
  const q4Colors = [
    "#cf5c66", // 1
    "#d86d63", // 2
    "#e28062", // 3
    "#ec9661", // 4
    "#f5af63", // 5
    "#dfbe69", // 6
    "#c6b76e", // 7
    "#c4b574", // 8 - gold
    "#cf5c66", // 9 - coral red
    "#6b7882", // 10 - slate gray
  ];

  // ── Q5 Comments Pagination ──
  // Page 2 displays up to 4 comments. Subsequent comments go onto Page 3 and onward (10 per page).
  const page2Comments = commentsQ5.slice(0, 4);
  const remainingComments = commentsQ5.slice(4);
  const remainingPages = [];
  for (let i = 0; i < remainingComments.length; i += 10) {
    remainingPages.push(remainingComments.slice(i, i + 10));
  }

  const totalPages = 2 + remainingPages.length;

  return (
    <div ref={ref} className="sm-printable-report text-[#212529] bg-transparent">
      {/* ═══════════════════════════════════════════════════════════════
          PAGE 1: Q1 (Profile) + Other Table + Q2 (Feedback Received)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sm-report-page print-chunk">
        {/* Running Header */}
        <div className="text-center text-[10px] leading-relaxed text-[#2d3748] font-normal px-4 pt-1 pb-3">
          {surveyTitle}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-start">
          {/* Q1 Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block bg-[#f1f3f5] border border-[#dee2e6] text-[#343a40] font-bold text-[10.5px] px-2 py-0.5 rounded-[3px]">
                Q1
              </span>
              <span className="text-[#6c757d] text-[11px]">
                {totalResponses} responses
              </span>
            </div>
            <h2 className="text-[16px] font-bold text-[#212529] mb-2 leading-tight">
              Profile of the Feedback Givers
            </h2>

            {/* Q1 Choices Table */}
            <table className="w-full text-left border-collapse border-b border-[#dee2e6] mb-3">
              <thead className="bg-[#f8f9fa] border-b border-[#dee2e6]">
                <tr>
                  <th className="py-2 px-3 font-bold text-[#212529] text-[11px]">
                    Answer Choices
                  </th>
                  <th className="py-2 px-3 font-bold text-[#212529] text-[11px] w-[26%]">
                    Percentage
                  </th>
                  <th className="py-2 px-3 font-bold text-[#212529] text-[11px] w-[20%]">
                    Responses
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {processedQ1.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-3 text-[#212529] text-[11px] flex items-center">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-2.5 shrink-0"
                        style={{
                          backgroundColor:
                            smDotColors[i % smDotColors.length],
                        }}
                      ></span>
                      <span>{c.name}</span>
                    </td>
                    <td className="py-1.5 px-3 text-[#212529] text-[11px]">
                      {c.percentage}%
                    </td>
                    <td className="py-1.5 px-3 text-[#212529] text-[11px]">
                      {c.count}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-[#dee2e6] font-bold">
                  <td className="py-2 px-3 text-[#212529] text-[11px]">Total</td>
                  <td className="py-2 px-3 text-[#212529] text-[11px]"></td>
                  <td className="py-2 px-3 text-[#212529] text-[11px]">{totalResponses}</td>
                </tr>
              </tbody>
            </table>

            {/* Q1 Other Table (if responses exist) */}
            {commentsQ1.length > 0 && (
              <div className="mt-2 mb-3">
                <table className="w-full text-left border-collapse border-b border-[#dee2e6]">
                  <thead className="bg-[#eef1f4]">
                    <tr>
                      <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase w-10 text-center">
                        #
                      </th>
                      <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase">
                        OTHER (PLEASE SPECIFY)
                      </th>
                      <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase w-40">
                        DATE
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f5]">
                    {commentsQ1.map((item, idx) => (
                      <tr key={idx} className="align-top hover:bg-slate-50/50">
                        <td className="py-1.5 px-3 text-[#6c757d] font-medium text-[10.5px] text-center">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 text-[#212529] text-[11px] leading-relaxed">
                          {item.text}
                        </td>
                        <td className="py-1.5 px-3 text-[#6c757d] text-[10.5px] whitespace-nowrap">
                          {item.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Q2 Section */}
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block bg-[#f1f3f5] border border-[#dee2e6] text-[#343a40] font-bold text-[10.5px] px-2 py-0.5 rounded-[3px]">
                Q2
              </span>
              <span className="text-[#6c757d] text-[11px]">
                {totalResponses} responses
              </span>
            </div>
            <h2 className="text-[16px] font-bold text-[#212529] mb-1 leading-tight">
              Feedback Received
            </h2>
            <p className="text-[10px] text-[#6c757d] mb-2 leading-normal">
              Multi-source feedback is given using a scale of 1 to 5 where 1 represents "Strongly Disagree" & 5 represents "Strongly Agree"
            </p>

            {/* Q2 Horizontal Bar Chart */}
            <div className="w-full h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={processedQ2}
                  margin={{ top: 10, right: 15, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e9ecef"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    ticks={[0, 1, 2, 3, 4, 5]}
                    axisLine={{ stroke: "#ced4da", strokeWidth: 1 }}
                    tickLine={false}
                    tick={{ fill: "#495057", fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={230}
                    interval={0}
                    tick={<CustomizedYAxisTickQ2 />}
                    axisLine={{ stroke: "#ced4da", strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <Bar
                    dataKey="average"
                    barSize={30}
                    fill="#785d85"
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="average"
                      content={<CustomQ2BarLabel />}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Running Footer */}
        <div className="text-center text-[10px] text-[#6c757d] font-normal pb-1 pt-2">
          <div className="w-6 h-[1px] bg-[#ced4da] mx-auto mb-1"></div>
          <span>1 / {totalPages}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 2: Q3 (Honesty) + Q4 (Overall Rating) + Q5 Comments (Part 1)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sm-report-page print-chunk">
        {/* Running Header */}
        <div className="text-center text-[10px] leading-relaxed text-[#2d3748] font-normal px-4 pt-1 pb-3">
          {surveyTitle}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-start">
          {/* Q3 Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block bg-[#f1f3f5] border border-[#dee2e6] text-[#343a40] font-bold text-[10.5px] px-2 py-0.5 rounded-[3px]">
                Q3
              </span>
              <span className="text-[#6c757d] text-[11px]">
                {totalResponses} responses
              </span>
            </div>
            <h2 className="text-[16px] font-bold text-[#212529] mb-2 leading-tight">
              Honesty and Integrity: do you have any concerns?
            </h2>

            {/* Q3 Table */}
            <table className="w-full text-left border-collapse border-b border-[#dee2e6] mb-3">
              <thead className="bg-[#f8f9fa] border-b border-[#dee2e6]">
                <tr>
                  <th className="py-2 px-3 font-bold text-[#212529] text-[11px]">
                    Answer Choices
                  </th>
                  <th className="py-2 px-3 font-bold text-[#212529] text-[11px] w-[26%]">
                    Percentage
                  </th>
                  <th className="py-2 px-3 font-bold text-[#212529] text-[11px] w-[20%]">
                    Responses
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {processedQ3.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-1.5 px-3 text-[#212529] text-[11px] flex items-center">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-2.5 shrink-0"
                        style={{
                          backgroundColor:
                            c.name.toLowerCase() === "yes"
                              ? "#00bf6f"
                              : "#3870b2",
                        }}
                      ></span>
                      <span>{c.name}</span>
                    </td>
                    <td className="py-1.5 px-3 text-[#212529] text-[11px]">
                      {c.percentage}%
                    </td>
                    <td className="py-1.5 px-3 text-[#212529] text-[11px]">
                      {c.count}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-[#dee2e6] font-bold">
                  <td className="py-2 px-3 text-[#212529] text-[11px]">Total</td>
                  <td className="py-2 px-3 text-[#212529] text-[11px]"></td>
                  <td className="py-2 px-3 text-[#212529] text-[11px]">{totalResponses}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Q4 Section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block bg-[#f1f3f5] border border-[#dee2e6] text-[#343a40] font-bold text-[10.5px] px-2 py-0.5 rounded-[3px]">
                Q4
              </span>
              <span className="text-[#6c757d] text-[11px]">
                {totalResponses} responses
              </span>
            </div>
            <h2 className="text-[16px] font-bold text-[#212529] mb-1 leading-tight">
              Overall rating of trainee's professionalism
            </h2>
            <p className="text-[10px] text-[#6c757d] mb-2 leading-normal">
              Marked using a scale of 1 - 10 where 1 is "Very Poor" and 10 is "Extremely Good"
            </p>

            {/* Q4 Vertical Bar Chart */}
            <div className="w-full h-[210px] mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={processedQ4}
                  margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e9ecef"
                  />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    tick={<CustomizedXAxisTickQ4 />}
                    axisLine={{ stroke: "#ced4da", strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                    allowDecimals={false}
                    axisLine={{ stroke: "#ced4da", strokeWidth: 1 }}
                    tickLine={false}
                    tick={{ fill: "#495057", fontSize: 10 }}
                  />
                  <Bar
                    dataKey="count"
                    barSize={48}
                    isAnimationActive={false}
                  >
                    {processedQ4.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={q4Colors[index % q4Colors.length]}
                      />
                    ))}
                    <LabelList
                      dataKey="count"
                      content={<CustomQ4BarLabel />}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Q5 Section (Heading + First Batch of Comments) */}
          <div className="mt-2">
            <h2 className="text-center text-[16px] font-bold text-[#212529] mb-0.5">
              Q5 Comments
            </h2>
            <div className="text-center text-[11px] text-[#6c757d] mb-3">
              Answered: {commentsQ5.length} &nbsp;&nbsp;&nbsp;&nbsp; Skipped:{" "}
              {Math.max(0, totalResponses - commentsQ5.length)}
            </div>

            {/* Comments Table */}
            <table className="w-full text-left border-collapse border-b border-[#dee2e6]">
              <thead className="bg-[#eef1f4]">
                <tr>
                  <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase w-10 text-center">
                    #
                  </th>
                  <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase">
                    RESPONSES
                  </th>
                  <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase w-40">
                    DATE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {page2Comments.length > 0 ? (
                  page2Comments.map((c, i) => (
                    <tr key={i} className="align-top hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-[#6c757d] font-medium text-[10.5px] text-center">
                        {i + 1}
                      </td>
                      <td className="py-2 px-3 text-[#212529] text-[11px] leading-relaxed whitespace-pre-wrap">
                        {c.text}
                      </td>
                      <td className="py-2 px-3 text-[#6c757d] text-[10.5px] whitespace-nowrap">
                        {c.date}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      className="py-4 px-3 text-center text-[#6c757d] italic text-[11px]"
                    >
                      There are no responses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Running Footer */}
        <div className="text-center text-[10px] text-[#6c757d] font-normal pb-1 pt-2">
          <div className="w-6 h-[1px] bg-[#ced4da] mx-auto mb-1"></div>
          <span>2 / {totalPages}</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 3+: Subsequent Q5 Comments (if more than 4 comments exist)
          ═══════════════════════════════════════════════════════════════ */}
      {remainingPages.map((pageComments, pageIdx) => (
        <div key={pageIdx} className="sm-report-page print-chunk">
          {/* Running Header */}
          <div className="text-center text-[10px] leading-relaxed text-[#2d3748] font-normal px-4 pt-1 pb-3">
            {surveyTitle}
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col justify-start">
            <table className="w-full text-left border-collapse border-b border-[#dee2e6]">
              <thead className="bg-[#eef1f4]">
                <tr>
                  <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase w-10 text-center">
                    #
                  </th>
                  <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase">
                    RESPONSES
                  </th>
                  <th className="py-1.5 px-3 font-bold text-[#495057] text-[10px] uppercase w-40">
                    DATE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f3f5]">
                {pageComments.map((c, i) => (
                  <tr key={i} className="align-top hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-[#6c757d] font-medium text-[10.5px] text-center">
                      {4 + pageIdx * 10 + i + 1}
                    </td>
                    <td className="py-2 px-3 text-[#212529] text-[11px] leading-relaxed whitespace-pre-wrap">
                      {c.text}
                    </td>
                    <td className="py-2 px-3 text-[#6c757d] text-[10.5px] whitespace-nowrap">
                      {c.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Running Footer */}
          <div className="text-center text-[10px] text-[#6c757d] font-normal pb-1 pt-2">
            <div className="w-6 h-[1px] bg-[#ced4da] mx-auto mb-1"></div>
            <span>{3 + pageIdx} / {totalPages}</span>
          </div>
        </div>
      ))}

      {/* ── Print & Screen Styles ── */}
      <style type="text/css">
        {`
          @media screen {
            .sm-report-page {
              width: 210mm;
              min-height: 297mm;
              margin: 20px auto;
              background: #ffffff;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
              border: 1px solid #e2e8f0;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding: 12mm 16mm 10mm 16mm;
            }
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 14mm 10mm 14mm;
            }
            .no-print, header, nav, [data-no-print] {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .sm-printable-report {
              background: #ffffff !important;
            }
            .sm-report-page {
              page-break-after: always;
              break-after: page;
              min-height: 275mm;
              height: 275mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              padding: 0;
              margin: 0;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
            }
            .sm-report-page:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          }
        `}
      </style>
    </div>
  );
});

export default PrintableReport;
