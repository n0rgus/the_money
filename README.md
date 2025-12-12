# the_money
Show me the Money - Interactive budget and financial management tool

**Cash Flow**
Use current balances and known income and expenses to:
- Show cash-flow over time
- Detect and negative cash events and their timing and size
- Compare up to 4 scenarios on the one table or graph.
- Add trend lines on graphs of sufficient data size and quality

Past Transactions
- Review prior income and expenses to provide:
- A basis for expected future transactions, both regular and ad hoc.
- Comparison of actual cash flow vs. a saved baseline.
- Finding possible areas for financial improvement by:
  - Categorising (and sub-categorising) spending  
  - Category type either discretionary, required or misc.
  - Identifying wastage e.g. interest, fees, duplicated services

**Credit Card**
Manage the timing offset caused by (most) transactions being on credit:
- Group all transactions against the appropriate card statement period
- Incorporate the due date of the closed, current and future statements into the cash-flow.
- Given known future spend events either on a cycle or as average daily spend and the current actual spend on the card, blend these together to:
  - Predict the closing card balance (and a confidence level)
  - Perform this at a per category level.
  - Show predicted close figure per category vs budgeted as an amount, and % of predicted and % of the total card spend.

**Data**
- Load in and store financial transactions as a form of input to the above areas.
  - Read in CSV or Excel files and save named column mapping for repeated sources 
  - All transactions need to be categorised.
    - Group them by common vendor (ignore location component) and if over 80% of prior transactions match, apply the same category.
    - Prompt the user for the ones where automation can’t be applied.
- Also allow manual creation of financial events, both one-off and recurring (with the ability to modify individual occurrences).
- Save all data to SQLite database with option to load/save recurring payments structure to external JSON file.

**Display**
Layout should be separate tabs for each of:
- Graphical overview
- Consolidated budget sheet 
  - Top level transaction types amortised by the given period (month, quarter, annual)
  - Drill-down to sub-categories
- Cash Flow graph
- Cash Flow table
- Current Financial State
- Imported data listing/review
