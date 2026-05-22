# Project Context: XcelReport

This project is a specialized Excel reporting dashboard focused on debt analysis across different sessions ("Phiên").

## Strict Protection & Feature Lock (CRITICAL)
- **Nợ khó đòi (Bad Debt) Module is fully locked**:
  - **Logic & Classification**:
    - Invoices with days overdue > 177 days (`NGAY_PHANH` based).
    - Customer type grouping: Column `LOAI_KHANG` specifies type (`1` or `1.0` = **Tổ chức**, `0` or `0.0` = **Cá nhân**). Fallback matches on prefix keywords in `TEN_KHANG` or defaults to **Cá nhân**.
    - **No duplicate Sery**: Always groups/deduplicates unique invoices by the Sery column (`SO_SERY`), summing the totals of matching series.
    - **Grouping by Billing Cycle**: Groups overdue invoices by month and year computed via `THANG` and `NAM` columns (falling back to `NGAY_PHANH` if empty).
  - **Layout & Visual Representation**:
    - Displays a horizontal progress bar representation per month showing distribution proportion of **Tổ chức** (Emerald, green-500) vs **Cá nhân** (Rose, red-500) computed purely within that month.
    - Title headers must strictly display: `Tháng/năm`, `Số hóa đơn`, `Tổng tiền`, `Tỷ lệ % (Biểu đồ ngang)`, and `Ghi chú (tc/cn)`.
    - Includes summary cards for total organization/individual bills count, total amount split, and individual percentages.
  - **No Unsolicited Modifications**: Any modification, simplifying, refactoring, or proactive adjustments to the **Nợ khó đòi** layout, charts, formulas, or tables are **strictly forbidden** unless the user explicitly requests them.

## Core Analysis Logic
- **Debt Session Analysis**: Debt is categorized based on the `MA_SOGCS` column into specific sessions: Phiên 20, 2 Phiên (B2), 3 Phiên (B3), and 1 Phiên (others).
- **Bad Debt Logic**: Identifies invoices older than 177 days (current date - `NGAY_PHANH` > 177) with non-negative amounts.
- **Refund Analysis**: Tracks customers with negative balances.

## Features
- **Overview Dashboard**: Professional metrics for total invoices, customers, and amounts.
- **Session Tables**: Detailed breakdown of debt by session (HD and Amount).
- **Bad Debt & Refund Exports**: Direct export of high-risk or refund-required customer lists.
- **Analytics Charts**: Visualization of debt and invoice distribution by session.

## Implementation Details
- Uses `xlsx` for parsing and exporting.
- Uses `recharts` for visualizations (Bar and Pie charts).
- Styling with Tailwind CSS and `lucide-react` icons.
