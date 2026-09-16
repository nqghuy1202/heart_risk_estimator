export type Lang = "en" | "vi";

export const LANGUAGES: Lang[] = ["en", "vi"];

/** Static UI text that never comes from the server. Field labels, choice labels, help
 * text, the model card, and prediction wording are translated server-side instead,
 * since the server is the one place that data is defined ({@link ../api.ts}). */
export interface Translations {
  topbarTitle: string;
  topbarMeta: string;
  languageLabel: string;
  skipLink: string;
  loading: string;
  heading: string;
  intro: string;
  footerNote: string;
  progressLabel: (filled: number, total: number) => string;
  errorsSummary: string;
  submit: string;
  submitting: string;
  submitNote: string;
  awaitingTitle: string;
  awaitingBody: string;
  awaitingSmallPrint: string;
  verdictMarginLabel: string;
  verdictSmallPrint: (nEstimators: number) => string;
  columnHint: (name: string) => string;
  requiredError: string;
  numberError: string;
  rangeError: (min: number, max: number) => string;
  schemaLoadError: string;
  submitError: string;
}

const en: Translations = {
  topbarTitle: "HL Care",
  topbarMeta: "AdaBoost · UCI Heart Disease",
  languageLabel: "Choose language",
  skipLink: "Skip to the form",
  loading: "Loading the form…",
  heading: "Risk assessment",
  intro:
    "Fill in thirteen clinical measurements. An AdaBoost classifier returns a risk class " +
    "and how firmly its stumps voted for it.",
  footerNote:
    "AdaBoost (scikit-learn) trained on the UCI Heart Disease dataset. The number of " +
    "estimators was chosen on the test set rather than a validation split, so the " +
    "accuracy above is mildly optimistic, and the dataset contains duplicated records.",
  progressLabel: (filled, total) => `${filled} of ${total} fields completed`,
  errorsSummary: "Some values need correcting. The affected fields are marked below.",
  submit: "Predict",
  submitting: "Predicting...",
  submitNote: "Nothing is stored. The values are used for this prediction only.",
  awaitingTitle: "No prediction yet",
  awaitingBody:
    "Fill in the thirteen measurements and select Predict. The risk class and how firmly the " +
    "stumps voted for it appear here.",
  awaitingSmallPrint:
    "Trained on 1,025 public records for a coursework project. Not a medical device, and not " +
    "a substitute for clinical assessment.",
  verdictMarginLabel: "Vote margin",
  verdictSmallPrint: (nEstimators) =>
    `The margin is how strongly the ${nEstimators} stumps leaned towards this class, not a ` +
    "calibrated probability of disease. Trained on 1,025 public records for a coursework " +
    "project. Not a medical device.",
  columnHint: (name) => `Model column: ${name}`,
  requiredError: "This field is required.",
  numberError: "Enter a number.",
  rangeError: (min, max) => `Enter a value between ${min} and ${max}.`,
  schemaLoadError: "The form could not be loaded.",
  submitError: "The prediction could not be run. Check that the server is still running.",
};

const vi: Translations = {
  topbarTitle: "HL Care",
  topbarMeta: "AdaBoost · UCI Heart Disease",
  languageLabel: "Chọn ngôn ngữ",
  skipLink: "Đi tới biểu mẫu",
  loading: "Đang tải biểu mẫu…",
  heading: "Đánh giá nguy cơ",
  intro:
    "Điền mười ba chỉ số lâm sàng. Bộ phân loại AdaBoost trả về một nhóm nguy cơ và mức độ " +
    "đồng thuận của các cây quyết định (stump) cho kết quả đó.",
  footerNote:
    "AdaBoost (scikit-learn) được huấn luyện trên bộ dữ liệu UCI Heart Disease. Số lượng bộ " +
    "ước lượng được chọn trên tập kiểm tra thay vì tập kiểm định riêng, nên độ chính xác ở " +
    "trên có phần lạc quan hơn thực tế, và bộ dữ liệu có chứa các bản ghi trùng lặp.",
  progressLabel: (filled, total) => `${filled}/${total} trường đã hoàn thành`,
  errorsSummary: "Một số giá trị cần được sửa lại. Các trường bị ảnh hưởng được đánh dấu bên dưới.",
  submit: "Dự đoán",
  submitting: "Đang dự đoán...",
  submitNote: "Không có dữ liệu nào được lưu trữ. Các giá trị chỉ dùng cho lần dự đoán này.",
  awaitingTitle: "Chưa có dự đoán",
  awaitingBody:
    "Điền đủ mười ba chỉ số rồi chọn Dự đoán. Nhóm nguy cơ và mức độ đồng thuận của các cây " +
    "quyết định sẽ hiển thị ở đây.",
  awaitingSmallPrint:
    "Huấn luyện trên 1.025 bản ghi công khai cho một dự án học tập. Đây không phải là thiết bị " +
    "y tế và không thay thế cho đánh giá lâm sàng.",
  verdictMarginLabel: "Mức chênh lệch phiếu bầu",
  verdictSmallPrint: (nEstimators) =>
    `Mức chênh lệch cho biết ${nEstimators} cây quyết định nghiêng về nhóm này mạnh đến đâu, ` +
    "không phải là xác suất mắc bệnh đã được hiệu chỉnh. Huấn luyện trên 1.025 bản ghi công " +
    "khai cho một dự án học tập. Đây không phải là thiết bị y tế.",
  columnHint: (name) => `Cột trong mô hình: ${name}`,
  requiredError: "Trường này là bắt buộc.",
  numberError: "Nhập một số.",
  rangeError: (min, max) => `Nhập giá trị từ ${min} đến ${max}.`,
  schemaLoadError: "Không thể tải biểu mẫu.",
  submitError: "Không thể thực hiện dự đoán. Kiểm tra xem máy chủ có đang chạy hay không.",
};

export const TRANSLATIONS: Record<Lang, Translations> = { en, vi };
