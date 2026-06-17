import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits to handle larger payloads if needed
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper to lazily initialize GoogleGenAI client to avoid crash if API key is missing
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Không tìm thấy GEMINI_API_KEY trong cấu hình hệ thống. Vui lòng thêm key trong Settings > Secrets.");
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API router for generating AI report in Word template style
  app.post("/api/generate-report", async (req, res) => {
    try {
      const { reportData } = req.body;
      if (!reportData) {
        return res.status(400).json({ error: "Dữ liệu báo cáo bị khuyết thiếu." });
      }

      console.log("Starting high-fidelity AI report generation for D-Office...");
      const ai = getAiClient();

      const comparisonDateStr = reportData.selectedComparisonDate 
        ? new Date(reportData.selectedComparisonDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '.../.../...';

      const dateObj = reportData.selectedComparisonDate ? new Date(reportData.selectedComparisonDate) : null;
      const dayVal = dateObj ? dateObj.getDate().toString().padStart(2, '0') : '...';
      const monthVal = dateObj ? (dateObj.getMonth() + 1).toString().padStart(2, '0') : '...';
      const yearVal = dateObj ? dateObj.getFullYear() : '2026';

      const pData = reportData.phienData || {
        phien20: { hd: 0, tien: 0 },
        phien1: { hd: 0, tien: 0 },
        phien2: { hd: 0, tien: 0 },
        phien3: { hd: 0, tien: 0 },
        tong: { hd: 0, tien: 0 },
        thoaiHoan: { customers: 0, hd: 0, tien: 0 },
        noKhoDoi: { customers: 0, hd: 0, tien: 0 }
      };

      const prompt = `Soạn thảo một báo cáo công nợ tiền điện chính xác theo phong cách văn bản hành chính Việt Nam để trình ký duyệt trên hệ thống D-Office của Công ty Điện lực Vũng Tàu.
Văn bản cần sử dụng ngôn từ trang trọng, chuẩn mực, rõ ràng của Tập đoàn Điện lực Việt Nam (EVN).

Sử dụng chính xác các số liệu phân tích sau đây (ĐÃ ĐƯỢC CHẮT LỌC VÀ KHỬ TRÙNG LẶP):
- Ngày phân tích dữ liệu: Ngày ${comparisonDateStr} (Ngày ${dayVal} tháng ${monthVal} năm ${yearVal})
- Tổng dư nợ tính theo phiên: ${pData.tong.tien.toLocaleString()} đ từ ${pData.tong.hd.toLocaleString()} hóa đơn.
- Các Phiên nợ:
  + Phiên 20: ${pData.phien20.hd.toLocaleString()} HĐ, số tiền ${pData.phien20.tien.toLocaleString()} đ
  + Phiên B1: ${pData.phien1.hd.toLocaleString()} HĐ, số tiền ${pData.phien1.tien.toLocaleString()} đ
  + Phiên B2: ${pData.phien2.hd.toLocaleString()} HĐ, số tiền ${pData.phien2.tien.toLocaleString()} đ
  + Phiên B3: ${pData.phien3.hd.toLocaleString()} HĐ, số tiền ${pData.phien3.tien.toLocaleString()} đ
  + Tổng nợ: ${pData.tong.hd.toLocaleString()} HĐ, tổng tiền ${pData.tong.tien.toLocaleString()} đ
- Dữ liệu Phân Tích Nợ Chi Tiết theo Số Kỳ (Tổng hợp từ file):
${JSON.stringify(reportData.globalDebtCycles || [], null, 2)}
- Thoái hoàn tồn: ${pData.thoaiHoan.customers.toLocaleString()} khách hàng với ${pData.thoaiHoan.hd.toLocaleString()} hóa đơn âm, tổng số tiền là ${pData.thoaiHoan.tien.toLocaleString()} đ.
- Nợ khó đòi phát sinh (>177 ngày): ${pData.noKhoDoi.hd.toLocaleString()} hóa đơn (${pData.noKhoDoi.customers.toLocaleString()} khách hàng), tổng tiền ${pData.noKhoDoi.tien.toLocaleString()} đ.
- Phân bổ nợ khó đòi nợ quá hạn theo từng tháng phát sinh:
${JSON.stringify(reportData.monthlyBreakdown || [], null, 2)}

Yêu cầu định cấu trúc văn bản hành chính Việt Nam để trình ký Word:
1. KHÔNG sử dụng các ký tự Markdown lập dị như gạch kẻ ngang dài, hàng loạt dấu hoa thị (***, ###) hay in đậm lồng lộn.
2. Hãy cấu trúc văn bản theo phong cách trang chuẩn của EVN Vũng Tàu:
   - Header trái: 
     CÔNG TY ĐIỆN LỰC VŨNG TÀU
     PHÒNG KINH DOANH
     Số:      /PKD
     V/v báo cáo tồn thu tiền điện
   - Header phải:
     CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
     Độc lập - Tự do - Hạnh phúc
     ---
     Vũng Tàu, ngày ${dayVal} tháng ${monthVal} năm ${yearVal}
   - Tiêu đề trung tâm: "Kính gửi: Ông Phó Giám đốc Kinh doanh"
   - Phần căn cứ:
     Căn cứ Quy trình kinh doanh điện năng số 2599/QĐ-EVNHCMC;
     Căn cứ kết quả rà soát tồn thu tiền điện đến thời điểm hiện tại,
   - Thân bài chính:
     "I./ Phân Tích
     Phòng Kinh doanh thực hiện thống kê số liệu tình hình thu và tồn thu tiền điện đến ngày ${comparisonDateStr} như sau:"

     - BẢNG 1: Bảng tổng hợp tình hình thu và tồn thu tiền điện (Vẽ bảng Markdown với chính xác các cột sau):
       Cột: | Tháng | Tồn đầu (HĐ) | Tồn đầu (Thành tiền) | Phát sinh (HĐ) | Phát sinh (Thành tiền) | Thu được (HĐ) | Thu được (Thành tiền) | Tồn cuối (HĐ) | Tồn cuối (Thành tiền) | Tỷ lệ theo phiên |
       Trong bảng này, do chúng ta không có số liệu Tồn đầu, Phát sinh, Thu được, nên hãy để trống hoàn toàn các ô này (hoặc điền các khoảng trống ngắn) để Người Dùng Tự Điền. 
       Duy nhất đối với cột "Tồn cuối" và "Tổng cộng", hãy điền trực tiếp giá trị HĐ là "${pData.tong.hd.toLocaleString()}" và Thành tiền là "${pData.tong.tien.toLocaleString()}". Cột Tỷ lệ hãy để trống để người dùng tự ghi.

     - Ghi chú phía dưới bảng 1: "(Đạt tỷ lệ thu theo phiên tổng công ty giao)"

     - "1. Phân tích tồn theo phiên":
       Vẽ BẢNG 2: Bảng phân tích tồn theo phiên chi tiết (Vẽ bảng Markdown rõ ràng):
       Cột: | Phiên 20 (HĐ) | Phiên 20 (Tiền) | Phiên B1 (HĐ) | Phiên B1 (Tiền) | Phiên B2 (HĐ) | Phiên B2 (Tiền) | Phiên B3 (HĐ) | Phiên B3 (Tiền) | Tổng (HĐ) | Tổng Tiền (đ) |
       Điền chính xác tuyệt đối các giá trị tương ứng của từng phiên:
       + Phiên 20: HĐ là ${pData.phien20.hd.toLocaleString()}, Tiền là ${pData.phien20.tien.toLocaleString()}
       + Phiên B1: HĐ là ${pData.phien1.hd.toLocaleString()}, Tiền là ${pData.phien1.tien.toLocaleString()}
       + Phiên B2: HĐ là ${pData.phien2.hd.toLocaleString()}, Tiền là ${pData.phien2.tien.toLocaleString()}
       + Phiên B3: HĐ là ${pData.phien3.hd.toLocaleString()}, Tiền là ${pData.phien3.tien.toLocaleString()}
       + Tổng: HĐ là ${pData.tong.hd.toLocaleString()}, Tiền là ${pData.tong.tien.toLocaleString()}

     - "2. Phân tích nợ chi tiết":
       Vẽ BẢNG 3: Bảng phân tích nợ chi tiết (Vẽ bảng Markdown phân bổ theo Số Kỳ nợ):
       Cột: | Số Kỳ | Khách Hàng | Hóa Đơn | Thành Tiền | Cơ Cấu TC/CN |
       Lập các hàng dựa trên dữ liệu Số Kỳ nợ thực tế trong globalDebtCycles. Điền đúng Số Kỳ, Khách Hàng, Hóa Đơn và Thành Tiền tương ứng. Đối với cột "Cơ Cấu TC/CN", viết "..." hoặc để trống để người dùng tự điền như yêu cầu hướng dẫn.

     - Thiết lập "Hiện trạng :"
       Ghi rõ 2 dòng cụ thể sau với số liệu thực tế:
       + - Tiền thoái hoàn gồm ${pData.thoaiHoan.customers.toLocaleString()} kh (${pData.thoaiHoan.hd.toLocaleString()} hd) = ${pData.thoaiHoan.tien.toLocaleString()} đồng
       + - Nợ khó đòi phát sinh đến nay: ${pData.noKhoDoi.hd.toLocaleString()} hd = ${pData.noKhoDoi.tien.toLocaleString()} đồng cụ thể:
       
       Vẽ BẢNG 4: Bảng phân bổ nợ khó đòi phát sinh theo tháng phát sinh (Vẽ bảng Markdown):
       Cột: | Tháng/năm | Hóa đơn | Thành tiền | Trong đó |
       Duyệt các tháng trong dữ liệu quá hạn, điền Tháng/năm, Hóa đơn và Thành tiền thực tế. Ở cột "Trong đó", hãy để một số gợi ý để trống như "SHBT: ... hd = ... đ; DN: ... đ" để người dùng tự điền phần còn khuyết thiếu.
       Hàng cuối cùng là "Tổng cộng" hiển thị ${pData.noKhoDoi.hd.toLocaleString()} HĐ và ${pData.noKhoDoi.tien.toLocaleString()} đồng.

   - Phần kiến nghị trình ký duyệt văn phòng:
     "II./ Kiến nghị cần được quan tâm:
     - Đối với khách hàng sinh hoạt nợ tiền điện nhiều kỳ: (cụ thể 3 kỳ danh sách đính kèm). Đề nghị thực hiện cắt điện kịp thời để không phát sinh thêm nợ khó đòi.
     - Với khách hàng nợ khó đòi thì Đội Thu ghi thường xuyên kiểm tra và phối hợp Đội Dịch vụ khách hàng đảm bảo rằng khách hàng không tự ý đấu nối hoặc đã lắp đặt đồng hồ mới tại vị trí khác (nếu có).
     - Đội Thu ghi phối hợp P. kế toán trích lập quỹ dự phòng để xử lý nợ.
     - Khách hàng nợ sử dụng vốn ngân sách đang còn nhiều. Đề nghị Đội Thu Ghi cố gắng liên hệ với các cơ quan ngân sách trên địa bàn để thống nhất cách thanh toán.
     - Hiện có ${pData.thoaiHoan.customers.toLocaleString()} khách hàng thoái hoàn tồn nhờ Đội quan tâm theo dõi để khách hàng cấn trừ tiền thoái hoàn.
     - Đội thu ghi quan tâm hơn 22 hóa đơn (13 kh) = 14,676,515 đồng đã đổi tên sang chủ thể mới : TRUNG TÂM QUẢN LÝ ĐIỀU HÀNH GIAO THÔNG ĐÔ THỊ nhưng vẫn chưa đổi chủ thể cho kỳ nợ tháng 2,3/2026."

   - Kết luận bài viết: "Trân trọng kính trình./."
   - Footer trình ký ban ngành:
     + Bên trái:
       Nơi nhận:
       - Giám đốc (để báo cáo);
       - Đội DVKH, Đội QLTG (thực hiện);
       - Lưu: VT, KD (TKS, NTHN).
     + Bên phải:
       PHÒNG KINH DOANH
       
       Trần Nam Trung
     + Ở cuối cùng:
       "Ý kiến phê duyệt của Phó Giám đốc Đặng Quang Trung"

Hãy phản hồi DUY NHẤT văn bản báo cáo hoàn chỉnh không thêm lời nói thừa thãi nào ngoài lề. Các bảng số liệu phải được định dạng bảng Markdown hoàn hảo để có thể dễ dàng chuyển đổi sang bảng Word sau đó.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const reportText = response.text || "";
      return res.json({ reportText });
    } catch (err: any) {
      console.error("Lỗi khi gọi Gemini API:", err);
      return res.status(500).json({ error: err.message || "Không thể khởi tạo AI để lấy dữ liệu." });
    }
  });

  // Vite development or production middleware routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fullstack Server] App running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
