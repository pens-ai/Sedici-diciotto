# Gestionale Case Vacanza - React App

## 🚀 Panoramica

Applicazione React moderna per la gestione di case vacanza con:
- ✅ Dashboard con statistiche generali e per casa
- ✅ Gestione case con template multipli per notte
- ✅ Gestione prodotti categorizzati
- ✅ Prenotazioni con template personalizzato e calcolo notti
- ✅ Anagrafica ospiti completa
- ✅ Costi fissi mensili per casa
- ✅ Personalizzazione aziendale e colori

## 📦 Installazione

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Build per produzione
npm run build
```

## 🏗️ Struttura Progetto

```
gestionale-react/
├── src/
│   ├── components/          # Componenti riutilizzabili
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Sidebar.jsx
│   ├── contexts/            # Context API per stato globale
│   │   └── AppContext.jsx
│   ├── pages/               # Pagine dell'applicazione
│   │   ├── Dashboard.jsx    ✅ COMPLETO
│   │   ├── Properties.jsx   ✅ COMPLETO
│   │   ├── Products.jsx     🚧 DA COMPLETARE
│   │   ├── Bookings.jsx     🚧 DA COMPLETARE
│   │   ├── FixedCosts.jsx   🚧 DA COMPLETARE
│   │   └── Settings.jsx     🚧 DA COMPLETARE
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## ✅ Pagine Completate

### 1. Dashboard (✅ COMPLETO)
- Vista generale con statistiche totali
- Vista per casa con dettagli singoli
- Prossime prenotazioni in arrivo
- Dettaglio costi fissi e variabili

### 2. Properties (✅ COMPLETO)
- CRUD completo case
- Gestione template multipli per casa
- Template con prodotti e quantità per notte
- Calcolo automatico costo template

## 🚧 Pagine da Completare

### 3. Products (Products.jsx)

**Funzionalità da implementare:**
- Lista prodotti raggruppati per categoria (accordion)
- CRUD prodotti con campi: nome, prezzo, unità, categoria
- Categorie: Colazione, Bagno, Biancheria, Consumabili
- Design con icone per categoria

**Componenti necessari:**
- Accordion per categorie
- Form per aggiungere/modificare prodotto
- Modale per conferma eliminazione

---

### 4. Bookings (Bookings.jsx)

**Funzionalità da implementare:**

#### A. Lista Prenotazioni
- Tabella con colonne: Casa, Ospite, Date (con notti), Ospiti, Canale, Ricavo, Costi, Margine
- Badge colorati per canali (Booking=blu, Airbnb=arancione, Diretto=verde)
- Azioni: Modifica (✏️), Anagrafica Ospiti (👥), Elimina (🗑️)

#### B. Modale Nuova/Modifica Prenotazione
```javascript
// Form fields:
- Casa (select)
- Nome Ospite
- Check-in (date)
- Check-out (date)
- Numero Ospiti
- Canale (Booking 15% / Airbnb 3% / Diretto 0%)
- Ricavo Lordo
- Template (select con opzione "Template Personalizzato")

// Features:
1. Calcolo automatico notti tra check-in e check-out
2. Visualizzazione notti: 🌙 X notti
3. Calcolo commissione automatico
4. Template dropdown con formato: "Nome (X-Y ospiti) - €XX/notte × N = €YYY"
5. Template Personalizzato apre modale prodotti
```

#### C. Modale Template Personalizzato
```javascript
// Features:
- Lista prodotti raggruppati per categoria
- Input quantità per ogni prodotto
- Calcolo real-time:
  - Costo per notte
  - Costo totale (per notte × notti)
- Pulsante "Applica Template"
```

#### D. Modale Anagrafica Ospiti
```javascript
// Features:
- Lista ospiti registrati per la prenotazione
- Pulsante "Aggiungi Ospite"
- Per ogni ospite form con:
  - Nome, Cognome
  - Data di nascita
  - Città di residenza
  - Tipo documento (select: Carta ID, Passaporto, Patente)
  - Numero documento
  - Scadenza documento
- Pulsante elimina ospite
- Salva tutti gli ospiti
```

**Logica Calcoli:**
```javascript
// Calculate nights
const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

// Calculate costs
if (customTemplate) {
  costs = customTemplate.totalCost; // Already includes nights
} else if (standardTemplate) {
  const costPerNight = template.products.reduce((sum, p) => 
    sum + (p.price * p.quantity), 0
  );
  costs = costPerNight * nights;
}

// Calculate commission
const commissionRate = {
  'booking': 0.15,
  'airbnb': 0.03,
  'diretto': 0.00
}[channel];
const commission = grossRevenue * commissionRate;
const netRevenue = grossRevenue - commission;

// Calculate margin
const margin = netRevenue - costs;

// Booking object
const booking = {
  id: Date.now(),
  propertyId,
  propertyName,
  guest,
  checkIn,
  checkOut,
  nights,
  guests,
  channel,
  grossRevenue,
  commission,
  netRevenue,
  costs,
  margin,
  templateData: { ... },
  guestRegistry: []
};
```

---

### 5. FixedCosts (FixedCosts.jsx)

**Funzionalità da implementare:**
- Lista costi fissi raggruppati per casa
- CRUD costi fissi con campi:
  - Casa (select)
  - Descrizione (es. "Bolletta Enel")
  - Importo mensile
  - Categoria (Utenze, Internet, Condominio, Assicurazione, Manutenzione, Altro)
- Totale mensile per casa
- Design con icone per categoria

---

### 6. Settings (Settings.jsx)

**Funzionalità da implementare:**

#### A. Anagrafica Aziendale
```javascript
// Form fields:
- Nome azienda
- Logo (upload immagine con preview)
- Partita IVA
- Codice Fiscale
- Indirizzo
- Telefono
- Email
```

#### B. Personalizzazione
```javascript
// Color Pickers:
- Colore Primario (default: #6b4ce6)
- Colore Secondario (default: #5a3ec4)
- Anteprima sidebar in tempo reale

// Icon Picker:
- Grid di icone selezionabili
- Icone: 🏠 🏡 🏘️ 🏰 🗝️ 🌅 ⭐ 💎
- Apply immediato alla sidebar
```

---

## 🎨 Design Guidelines

### Colori Principali
```javascript
primary: '#6b4ce6'   // Viola
secondary: '#5a3ec4' // Viola scuro
green: '#0f9d58'     // Margini positivi
red: '#e02820'       // Margini negativi / errori
orange: '#f59e0b'    // Costi / warning
```

### Componenti da Usare
- `<Button>` - Per azioni
- `<Card>` - Per contenitori
- `<Modal>` - Per form e conferme
- `<Input>`, `<Select>`, `<Textarea>` - Per form
- `<StatCard>` - Per statistiche

### Icone (lucide-react)
```javascript
import { 
  Plus, Edit2, Trash2, Save, X,
  Calendar, Home, Package, DollarSign, Users,
  TrendingUp, Settings, ...
} from 'lucide-react';
```

---

## 📝 State Management

### Context Methods Disponibili

```javascript
const {
  // State
  properties, products, bookings, fixedCosts, companyInfo, customization,
  
  // Properties
  addProperty, updateProperty, deleteProperty,
  
  // Templates
  addTemplate, updateTemplate, deleteTemplate,
  
  // Products
  addProduct, updateProduct, deleteProduct,
  
  // Bookings
  addBooking, updateBooking, deleteBooking,
  
  // Fixed Costs
  addFixedCost, updateFixedCost, deleteFixedCost,
  
  // Settings
  setCompanyInfo, setCustomization
} = useApp();
```

---

## 🔧 Tips per Sviluppo

### 1. Gestione Form con State
```javascript
const [form, setForm] = useState({ campo1: '', campo2: '' });

const handleChange = (field, value) => {
  setForm({ ...form, [field]: value });
};

<Input 
  value={form.campo1}
  onChange={(e) => handleChange('campo1', e.target.value)}
/>
```

### 2. Modale Pattern
```javascript
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingItem, setEditingItem] = useState(null);

const handleAdd = () => {
  setEditingItem(null);
  setForm(initialForm);
  setIsModalOpen(true);
};

const handleEdit = (item) => {
  setEditingItem(item);
  setForm(item);
  setIsModalOpen(true);
};

const handleSave = () => {
  if (editingItem) {
    updateItem(editingItem.id, form);
  } else {
    addItem(form);
  }
  setIsModalOpen(false);
};
```

### 3. Calcoli con useMemo
```javascript
const totalCost = useMemo(() => {
  return products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
}, [products]);
```

### 4. Formattazione Date
```javascript
// Per input date
const formatDateForInput = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

// Per display
const formatDateForDisplay = (date) => {
  return new Date(date).toLocaleDateString('it-IT');
};
```

---

## 🚀 Next Steps

1. **Completa pagina Products**
   - Accordion categorie
   - CRUD prodotti

2. **Completa pagina Bookings** (più complessa)
   - Form prenotazione
   - Calcolo notti automatico
   - Template personalizzato modal
   - Anagrafica ospiti modal

3. **Completa pagina FixedCosts**
   - CRUD costi fissi
   - Raggruppamento per casa

4. **Completa pagina Settings**
   - Form anagrafica
   - Color picker
   - Icon picker

5. **Testing & Polish**
   - Testa tutti i flussi
   - Verifica calcoli
   - Responsive design

---

## 🎯 Priorità

1. **Alta**: Bookings (funzionalità core)
2. **Media**: Products, FixedCosts
3. **Bassa**: Settings (già funzionale con localStorage)

---

## 📚 Risorse Utili

- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Vite Docs](https://vitejs.dev/)

---

**Buon sviluppo! 🚀**
