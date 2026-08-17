import React, { forwardRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

const CustomizedAxisTick = (props) => {
  const { x, y, payload } = props;
  const words = payload.value.split("-");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={15} textAnchor="middle" fill="#666" fontSize="11">
        {words[0].trim() + (words.length > 1 ? " -" : "")}
      </text>
      {words[1] && (
        <text x={0} y={29} textAnchor="middle" fill="#666" fontSize="11">
          {words.slice(1).join("-").trim()}
        </text>
      )}
    </g>
  );
};

const CustomizedYAxisTickQ2 = (props) => {
  const { x, y, payload } = props;
  const rawText = payload.value || "";

  const maxLineLength = 26;
  const words = rawText.split(" ");
  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    if ((currentLine + " " + words[i]).length > maxLineLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = words[i];
    } else {
      currentLine += (currentLine ? " " : "") + words[i];
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  if (lines.length > 5) {
    lines[4] = lines[4] + "...";
    lines.length = 5;
  }

  const lineHeight = 12;
  const startY = -((lines.length - 1) * lineHeight) / 2;

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fill="#666" fontSize="11">
        {lines.map((line, i) => (
          <tspan key={i} x={-10} dy={i === 0 ? startY + 4 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const PrintableReport = forwardRef(({ survey, data }, ref) => {
  if (!data || !data.details || !data.rollups || !data.bulk) {
    return null;
  }

  // Parses survey title to extract Doctor, Trainer, and Specialty
  const getHeaderInfo = () => {
    let doctorName = "";
    let trainerName = "";
    let specialty = "";

    if (survey && survey.title) {
      let text = survey.title
        .replace(/Multisource Feedback Form \(MSF\)/i, "")
        .trim();

      const specialtyMatch = text.match(/Specialty\s*[-:]?\s*(.*)$/i);
      if (specialtyMatch) {
        specialty = specialtyMatch[1].trim();
        text = text.replace(specialtyMatch[0], "").trim();
      }

      const trainerMatch = text.match(/Trainer\s*[-:]?\s*(.*)$/i);
      if (trainerMatch) {
        trainerName = trainerMatch[1].trim();
        text = text.replace(trainerMatch[0], "").trim();
      }

      if (text) {
        doctorName = text.trim();
      }
    }

    return { doctorName, trainerName, specialty };
  };

  const { doctorName, trainerName, specialty } = getHeaderInfo();

  // Extract rollups safely
  const getRollup = (questionIdx) => {
    return data.rollups.data[questionIdx]?.summary[0] || {};
  };

  const totalResponses = survey.response_count;

  // Q1 Processing (Professions)
  const q1Rollup = getRollup(0);
  const q1Choices = data.details.pages[0].questions[0].answers.choices || [];
  const processedQ1 = q1Choices
    .map((c) => {
      const stat = (q1Rollup.choices || []).find((r) => r.id === c.id);
      const count = stat ? stat.count : 0;
      const percentage =
        totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(2) : 0;
      return { name: c.text, count, percentage };
    })
    .filter((c) => c.count > 0);

  // Q2 Processing (Matrix)
  const q2Rollup = getRollup(1);
  const q2Rows = data.details.pages[0].questions[1].answers.rows || [];
  const processedQ2 = q2Rows.map((row) => {
    const stat = (q2Rollup.rows || []).find((r) => r.id === row.id);
    const textRaw = row.text.replace(/<[^>]+>/g, "").trim();
    return {
      name: textRaw,
      average: stat && stat.stats ? parseFloat(stat.stats.mean.toFixed(2)) : 0,
    };
  });

  // Q3 Processing (Yes/No)
  const q3Rollup = getRollup(2);
  const q3Choices = data.details.pages[0].questions[2].answers.choices || [];
  const processedQ3 = q3Choices.map((c) => {
    const stat = (q3Rollup.choices || []).find((r) => r.id === c.id);
    const count = stat ? stat.count : 0;
    const percentage =
      totalResponses > 0 ? ((count / totalResponses) * 100).toFixed(2) : 0;
    return { name: c.text, count, percentage };
  });

  // Q4 Processing (Overall Rating 1-10)
  const q4Rollup = getRollup(3);
  const q4Choices = data.details.pages[0].questions[3].answers.choices || [];
  const processedQ4 = q4Choices.map((c) => {
    // Keep raw name to allow the customized XAxis tick to split and wrap the strings
    const stat = (q4Rollup.choices || []).find((r) => r.id === c.id);
    return {
      name: c.text,
      count: stat ? stat.count : 0,
    };
  });

  // Q1 & Q5 & Q6 Processing (Free Text)
  const q1Id = data.details.pages[0].questions[0].id;
  const q5Id = data.details.pages[0].questions[4].id;
  const q6Id = data.details.pages[0].questions[5].id;
  const q7Id = data.details.pages[0].questions[6].id; // Date

  const responses = data.bulk.data || [];
  const commentsQ1 = [];
  const commentsQ5 = [];

  responses.forEach((resp) => {
    const pages = resp.pages || [];
    if (pages.length > 0) {
      const qs = pages[0].questions || [];
      const q1Ans = qs.find((q) => q.id === q1Id);
      const q5Ans = qs.find((q) => q.id === q5Id);
      const q7Ans = qs.find((q) => q.id === q7Id); // date

      let dateSubmitted = "Undated";
      if (q7Ans && q7Ans.answers && q7Ans.answers[0]?.text) {
        dateSubmitted = q7Ans.answers[0].text;
      }

      // Parse Q5
      if (q5Ans && q5Ans.answers && q5Ans.answers[0]?.text) {
        commentsQ5.push({
          text: q5Ans.answers[0].text,
          date: dateSubmitted || resp.date_created.split("T")[0],
        });
      }

      // Parse Q1 Other
      if (q1Ans && q1Ans.answers) {
        const otherAns = q1Ans.answers.find(
          (a) =>
            a.text && a.text.trim().toLowerCase() !== "other (please specify)",
        );
        if (otherAns && otherAns.text && otherAns.text.trim()) {
          commentsQ1.push({
            text: otherAns.text.trim(),
            date: dateSubmitted || resp.date_created.split("T")[0],
          });
        }
      }
    }
  });

  // Soft, light pastel categorical colors
  const modernColors = [
    "#8f9febff", // Indigo 300
    "#45ddc6ff", // Teal 300
    "#ee8a96ff", // Rose 300
    "#eec641ff", // Amber 300
    "#b1a3e7ff", // Violet 300
    "#4febc4ff", // Pink 300
    "#7dd3fc", // Sky 300
    "#6ee7b7", // Emerald 300
    "#fdba74", // Orange 300
    "#cbd5e1"  // Slate 300
  ];

  return (
    <div
      ref={ref}
      className="font-sans text-gray-900 bg-white"
      style={{ minHeight: "297mm", width: "210mm", boxSizing: "border-box" }}
    >
      {/* HEADER */}
      <div className="print-chunk text-center pb-8 pt-4 mb-10 border-b border-slate-200">
        <h1 className="text-lg font-extrabold mb-4 text-slate-800 tracking-tight whitespace-pre-line">
          {survey.title || "Multisource Feedback Form (MSF)"}
        </h1>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-slate-600">
          {doctorName && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Doctor:</span>
              <span className="font-semibold text-slate-800">{doctorName}</span>
            </div>
          )}
          {trainerName && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Trainer:</span>
              <span className="font-semibold text-slate-800">{trainerName}</span>
            </div>
          )}
          {specialty && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">Specialty:</span>
              <span className="font-semibold text-slate-800">{specialty}</span>
            </div>
          )}
        </div>
      </div>

      {/* Q1: Professions */}
      <div className="print-chunk bg-white border border-slate-100 p-8 mb-12 shadow-sm page-break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">
          Q1 Profile of the Feedback Givers
        </h2>
        <div className="flex gap-4 text-xs font-semibold text-slate-500 mb-6 uppercase tracking-wider">
          <span className="bg-slate-100 px-2 py-1">Answered: {totalResponses}</span>
          <span className="bg-slate-100 px-2 py-1">Skipped: 0</span>
        </div>
        <table className="w-full text-sm text-left border-collapse mb-8 border border-slate-100 overflow-hidden">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs">
                Answer Choices
              </th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-1/4">
                Percentage
              </th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-1/4">
                Responses
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedQ1.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-slate-700 font-medium flex items-center">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-3 shadow-sm"
                    style={{ backgroundColor: modernColors[i % modernColors.length] }}
                  ></span>
                  {c.name}
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{c.percentage}%</td>
                <td className="py-3 px-4 text-slate-600 font-medium">{c.count}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 border-t border-slate-200 font-bold">
              <td className="py-3 px-4 text-slate-800">Total</td>
              <td className="py-3 px-4 text-slate-800">-</td>
              <td className="py-3 px-4 text-slate-800">{totalResponses}</td>
            </tr>
          </tbody>
        </table>

        {/* Q1 'Other' Comments Table */}
        <table className="w-full text-sm text-left border-collapse border border-slate-100 overflow-hidden">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-12 text-center">
                #
              </th>
              <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs">
                Other (Please Specify)
              </th>
              <th className="py-2.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-32 text-center">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {commentsQ1.length > 0 ? (
              commentsQ1.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 font-semibold text-center text-xs">
                    {i + 1}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{c.text}</td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs font-medium whitespace-nowrap text-center">
                    {c.date}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 px-4 text-center text-slate-500 italic" colSpan="3">
                  There are no responses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Q2: Matrix Rating (Horizontal Bar Chart) */}
      <div className="print-chunk bg-white border border-slate-100 p-8 mb-12 shadow-sm page-break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">
          Q2 Feedback Received
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Multi-source feedback is given using a scale of 1 to 5 where 1 represents "Strongly Disagree" & 5 represents "Strongly Agree"
        </p>
        <div className="flex gap-4 text-xs font-semibold text-slate-500 mb-6 uppercase tracking-wider">
          <span className="bg-slate-100 px-2 py-1">Answered: {totalResponses}</span>
          <span className="bg-slate-100 px-2 py-1">Skipped: 0</span>
        </div>
        <div className="flex justify-center w-full mt-2">
          <div className="w-full h-[460px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={processedQ2}
                margin={{ top: 5, right: 35, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={220}
                  interval={0}
                  tick={<CustomizedYAxisTickQ2 />}
                  axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar
                  dataKey="average"
                  barSize={32}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                >
                  {processedQ2.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={modernColors[index % modernColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="average"
                    position="right"
                    style={{
                      fill: "#475569",
                      fontSize: 13,
                      fontWeight: "700"
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Q3: Yes/No Honesty & Integrity */}
      <div className="print-chunk bg-white border border-slate-100 p-8 mb-12 shadow-sm page-break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">
          Q3 Honesty and Integrity: do you have any concerns?
        </h2>
        <div className="flex gap-4 text-xs font-semibold text-slate-500 mb-6 mt-2 uppercase tracking-wider">
          <span className="bg-slate-100 px-2 py-1">Answered: {totalResponses}</span>
          <span className="bg-slate-100 px-2 py-1">Skipped: 0</span>
        </div>
        <table className="w-full text-sm text-left border-collapse border border-slate-100 overflow-hidden">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs">
                Answer Choices
              </th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-1/4">
                Percentage
              </th>
              <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-1/4">
                Responses
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processedQ3.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-4 text-slate-700 font-medium flex items-center">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-3 shadow-sm"
                    style={{ backgroundColor: modernColors[i % modernColors.length] }}
                  ></span>
                  {c.name}
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{c.percentage}%</td>
                <td className="py-3 px-4 text-slate-600 font-medium">{c.count}</td>
              </tr>
            ))}
            <tr className="bg-slate-50 border-t border-slate-200 font-bold">
              <td className="py-3 px-4 text-slate-800">Total</td>
              <td className="py-3 px-4 text-slate-800">-</td>
              <td className="py-3 px-4 text-slate-800">{totalResponses}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Q4: Overall Rating (Vertical Bar Chart) */}
      <div className="print-chunk bg-white border border-slate-100 p-8 mb-12 shadow-sm page-break-inside-avoid">
        <h2 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">
          Q4 Overall rating of trainee's professionalism
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Marked using a scale of 1 - 10 where 1 is "Very Poor" and 10 is "Extremely Good"
        </p>
        <div className="flex gap-4 text-xs font-semibold text-slate-500 mb-6 uppercase tracking-wider">
          <span className="bg-slate-100 px-2 py-1">Answered: {totalResponses}</span>
          <span className="bg-slate-100 px-2 py-1">Skipped: 0</span>
        </div>
        <div className="flex justify-center w-full mt-2">
          <div className="w-[90%] h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={processedQ4}
                margin={{ top: 20, right: 30, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  interval={0}
                  tick={<CustomizedAxisTick />}
                  axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar
                  dataKey="count"
                  fill="#64748b"
                  barSize={40}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                >
                  {processedQ4.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={modernColors[index % modernColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fill: "#475569", fontSize: 13, fontWeight: "bold" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Q5: Comments */}
      {commentsQ5.length > 0 && (
        <div className="print-chunk bg-white border border-slate-100 p-8 mb-4 shadow-sm page-break-inside-avoid">
          <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight border-b border-slate-100 pb-4">
            Q5 Comments
          </h2>
          <table className="w-full text-sm text-left border-collapse border border-slate-100 overflow-hidden">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-12 text-center">#</th>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Responses</th>
                <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-32 text-center">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commentsQ5.map((c, i) => (
                <tr key={i} className="align-top hover:bg-slate-50/50 transition-colors page-break-inside-avoid">
                  <td className="py-4 px-4 text-center text-slate-400 font-semibold text-[11px]">{i + 1}</td>
                  <td className="py-4 px-4 text-slate-700 leading-relaxed whitespace-pre-wrap font-medium text-xs">
                    {c.text}
                  </td>
                  <td className="py-4 px-4 text-slate-500 text-[11px] text-center font-medium">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CSS overrides for printing format */}
      <style type="text/css" media="print">
        {`
           @page { size: auto; margin: 20mm; }
           body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
           .page-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        `}
      </style>
    </div>
  );
});

export default PrintableReport;
