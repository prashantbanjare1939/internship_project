# \# RetailOS — AI-Powered Retail Intelligence Platform

# 

# RetailOS is an end-to-end retail analytics and machine learning application built using the \*\*YBI Foundation Retail Sales dataset\*\*. It transforms raw retail transaction data into interactive analytics, sales prediction, customer segmentation, business recommendations, and an optional GenAI-powered retail assistant.

# 

# \## Key Features

# 

# \- 📊 \*\*Interactive Retail Dashboard\*\* — Revenue, sales, product and category performance insights.

# \- 🤖 \*\*Machine Learning Sales Predictor\*\* — Random Forest regression model for transaction-level sales estimation.

# \- 📈 \*\*Model Evaluation\*\* — R², MAE and RMSE metrics using a held-out test dataset.

# \- 👥 \*\*Customer Segmentation\*\* — K-Means clustering based on customer purchasing behaviour.

# \- 💡 \*\*Business Recommendations\*\* — Data-driven insights for products, categories and customers.

# \- 🤖 \*\*Retail Copilot\*\* — Natural-language business analysis using optional GenAI integration.

# \- 🔄 \*\*Local Fallback Assistant\*\* — The application remains functional even without an external AI API.

# \- 🌐 \*\*Flask Backend\*\* — REST APIs connecting the frontend with the ML and analytics components.

# 

# \## Technologies Used

# 

# \- Python

# \- Flask

# \- Pandas

# \- NumPy

# \- Scikit-learn

# \- Joblib

# \- HTML5

# \- CSS3

# \- JavaScript

# \- Chart.js

# \- OpenAI API (optional)

# 

# \## Project Structure

# 

# ```text

# RetailOS/

# ├── app.py

# ├── index.html

# ├── analytics.html

# ├── predictor.html

# ├── recommendations.html

# ├── css/

# │   └── app.css

# ├── js/

# │   ├── data.js

# │   ├── shared.js

# │   ├── overview.js

# │   ├── analytics.js

# │   ├── predictor.js

# │   └── recommendations.js

# ├── ml/

# │   └── train\_model.py

# ├── models/

# │   ├── retail\_sales\_model.joblib

# │   └── metrics.json

# ├── data/

# │   └── RetailSales.csv

# ├── requirements.txt

# ├── .env.example

# └── .gitignore

