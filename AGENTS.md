# Project Context: XcelReport

This project is a specialized Excel reporting dashboard focused on debt analysis across different sessions ("Phiên").

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
