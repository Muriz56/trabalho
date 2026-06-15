const STORAGE_KEY = "ephyra-finance-state";
const LEGACY_STORAGE_KEY = "ephyra-finance-transactions";

const transactionForm = document.querySelector("#transactionForm");
const descriptionInput = document.querySelector("#descriptionInput");
const amountInput = document.querySelector("#amountInput");
const formMessage = document.querySelector("#formMessage");
const transactionList = document.querySelector("#transactionList");
const emptyState = document.querySelector("#emptyState");
const clearDataButton = document.querySelector("#clearDataButton");
const overspendingAlert = document.querySelector("#overspendingAlert");

const balanceAmount = document.querySelector("#balanceAmount");
const balanceStatus = document.querySelector("#balanceStatus");
const incomeAmount = document.querySelector("#incomeAmount");
const expenseAmount = document.querySelector("#expenseAmount");
const transactionCount = document.querySelector("#transactionCount");
const needsAmount = document.querySelector("#needsAmount");
const wantsAmount = document.querySelector("#wantsAmount");
const investmentsAmount = document.querySelector("#investmentsAmount");
const incomeBar = document.querySelector("#incomeBar");
const expenseBar = document.querySelector("#expenseBar");
const incomeBarValue = document.querySelector("#incomeBarValue");
const expenseBarValue = document.querySelector("#expenseBarValue");

let appState = loadState();

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function createEmptyState() {
  return {
    transactions: [],
    totals: {
      income: 0,
      expense: 0,
      balance: 0
    }
  };
}

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (savedState) {
    try {
      return normalizeState(JSON.parse(savedState));
    } catch (error) {
      console.warn("Nao foi possivel carregar os dados salvos.", error);
    }
  }

  // Mantem compatibilidade com versoes antigas que salvavam apenas a lista.
  const legacyTransactions = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (legacyTransactions) {
    try {
      return normalizeState({ transactions: JSON.parse(legacyTransactions) });
    } catch (error) {
      console.warn("Nao foi possivel carregar o historico antigo.", error);
    }
  }

  return createEmptyState();
}

function normalizeState(state) {
  const safeState = createEmptyState();
  const transactions = Array.isArray(state.transactions) ? state.transactions : [];

  safeState.transactions = transactions
    .map(normalizeTransaction)
    .filter(Boolean);
  safeState.totals = calculateTotals(safeState.transactions);

  return safeState;
}

function normalizeTransaction(transaction) {
  const amount = Number(transaction.amount);
  const type = transaction.type === "expense" ? "expense" : "income";
  const description = String(transaction.description || "").trim();

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    id: transaction.id || createTransactionId(),
    description,
    amount,
    type,
    date: transaction.date || new Date().toLocaleDateString("pt-BR")
  };
}

function saveState() {
  syncTotals();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

function syncTotals() {
  appState.totals = calculateTotals(appState.transactions);
}

function formatMoney(value) {
  return moneyFormatter.format(value);
}

function createTransactionId() {
  return `transaction-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function calculateTotals(transactions = appState.transactions) {
  return transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === "income") {
        totals.income += transaction.amount;
      } else {
        totals.expense += transaction.amount;
      }

      totals.balance = totals.income - totals.expense;
      return totals;
    },
    { income: 0, expense: 0, balance: 0 }
  );
}

function parseAmount(value) {
  const normalizedValue = value.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return Number.NaN;
  }

  return Number(normalizedValue);
}

function sanitizeAmountValue(value) {
  const cleanedValue = value.replace(/[^\d,.]/g, "");
  const separatorIndex = cleanedValue.search(/[,.]/);

  if (separatorIndex === -1) {
    return cleanedValue;
  }

  const integerPart = cleanedValue.slice(0, separatorIndex).replace(/[,.]/g, "");
  const decimalSeparator = cleanedValue.charAt(separatorIndex);
  const decimalPart = cleanedValue
    .slice(separatorIndex + 1)
    .replace(/[,.]/g, "")
    .slice(0, 2);

  return `${integerPart}${decimalSeparator}${decimalPart}`;
}

function updateDashboard() {
  syncTotals();

  const { income, expense, balance } = appState.totals;
  const highestTotal = Math.max(income, expense, 1);
  const incomePercent = (income / highestTotal) * 100;
  const expensePercent = (expense / highestTotal) * 100;

  balanceAmount.textContent = formatMoney(balance);
  incomeAmount.textContent = formatMoney(income);
  expenseAmount.textContent = formatMoney(expense);
  transactionCount.textContent = String(appState.transactions.length);

  needsAmount.textContent = formatMoney(income * 0.5);
  wantsAmount.textContent = formatMoney(income * 0.3);
  investmentsAmount.textContent = formatMoney(income * 0.2);

  incomeBar.style.width = `${incomePercent}%`;
  expenseBar.style.width = `${expensePercent}%`;
  incomeBarValue.textContent = formatMoney(income);
  expenseBarValue.textContent = formatMoney(expense);

  overspendingAlert.classList.toggle("is-hidden", expense <= income);
  updateBalanceStatus();
}

function updateBalanceStatus() {
  const { balance } = appState.totals;

  if (appState.transactions.length === 0) {
    balanceStatus.textContent = "Tudo pronto para comecar.";
    return;
  }

  if (balance > 0) {
    balanceStatus.textContent = "Seu saldo esta positivo. Bom trabalho!";
    return;
  }

  if (balance === 0) {
    balanceStatus.textContent = "Receitas e despesas estao equilibradas.";
    return;
  }

  balanceStatus.textContent = "Atencao: suas despesas superaram as receitas.";
}

function renderTransactions() {
  transactionList.innerHTML = "";
  emptyState.classList.toggle("is-hidden", appState.transactions.length > 0);

  appState.transactions.forEach((transaction) => {
    transactionList.appendChild(createTransactionElement(transaction));
  });
}

function createTransactionElement(transaction) {
  const item = document.createElement("li");
  const isIncome = transaction.type === "income";

  item.className = "transaction-item";
  item.dataset.id = transaction.id;

  const main = document.createElement("div");
  main.className = "transaction-main";

  const icon = document.createElement("span");
  icon.className = "transaction-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = isIncome ? "💵" : "💳";

  const title = document.createElement("div");
  title.className = "transaction-title";

  const description = document.createElement("strong");
  description.textContent = transaction.description;
  description.title = transaction.description;

  const details = document.createElement("span");
  details.textContent = `${isIncome ? "Receita" : "Despesa"} • ${transaction.date}`;

  title.append(description, details);
  main.append(icon, title);

  const value = document.createElement("span");
  value.className = `transaction-value ${isIncome ? "income" : "expense"}`;
  value.textContent = `${isIncome ? "+" : "-"} ${formatMoney(transaction.amount)}`;

  const removeButton = document.createElement("button");
  removeButton.className = "remove-button";
  removeButton.type = "button";
  removeButton.textContent = "🗑️";
  removeButton.setAttribute("aria-label", `Excluir transacao ${transaction.description}`);

  item.append(main, value, removeButton);

  return item;
}

function setFormMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-success", type === "success");
}

function clearFormMessage() {
  setFormMessage("");
}

function addTransaction(event) {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = parseAmount(amountInput.value);
  const type = new FormData(transactionForm).get("type");

  if (!description) {
    setFormMessage("Informe uma descricao para a transacao.");
    descriptionInput.focus();
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setFormMessage("Informe um valor maior que zero, usando apenas numeros.");
    amountInput.focus();
    return;
  }

  appState.transactions.unshift({
    id: createTransactionId(),
    description,
    amount,
    type,
    date: new Date().toLocaleDateString("pt-BR")
  });

  saveState();
  renderApp();
  transactionForm.reset();
  document.querySelector('input[name="type"][value="income"]').checked = true;
  setFormMessage("Transacao adicionada com sucesso.", "success");
  descriptionInput.focus();
}

function removeTransaction(transactionId) {
  appState.transactions = appState.transactions.filter(
    (transaction) => transaction.id !== transactionId
  );
  saveState();
  renderApp();
}

function handleTransactionListClick(event) {
  const removeButton = event.target.closest(".remove-button");

  if (!removeButton) {
    return;
  }

  const item = removeButton.closest(".transaction-item");
  const transactionId = item.dataset.id;

  item.classList.add("is-removing");
  item.addEventListener("animationend", () => removeTransaction(transactionId), { once: true });
}

function clearAllData() {
  if (appState.transactions.length === 0) {
    setFormMessage("Nao existem dados para limpar.");
    return;
  }

  const wantsToClear = confirm("Deseja apagar todas as transacoes salvas?");

  if (!wantsToClear) {
    return;
  }

  appState = createEmptyState();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  renderApp();
  setFormMessage("Todos os dados foram apagados.", "success");
}

function handleAmountInput() {
  const sanitizedValue = sanitizeAmountValue(amountInput.value);

  if (amountInput.value !== sanitizedValue) {
    amountInput.value = sanitizedValue;
  }
}

function renderApp() {
  renderTransactions();
  updateDashboard();
}

transactionForm.addEventListener("submit", addTransaction);
descriptionInput.addEventListener("input", clearFormMessage);
amountInput.addEventListener("input", () => {
  handleAmountInput();
  clearFormMessage();
});
transactionList.addEventListener("click", handleTransactionListClick);
clearDataButton.addEventListener("click", clearAllData);

saveState();
renderApp();
