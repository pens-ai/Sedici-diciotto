import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it, enUS, es, fr, zhCN, ar } from 'date-fns/locale';
import {
  User,
  Calendar,
  MapPin,
  Users,
  FileText,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Globe,
} from 'lucide-react';
import { getBookingByToken, submitGuestData } from '../api/checkin.api';

// Translations object
const translations = {
  it: {
    locale: it,
    flag: '🇮🇹',
    name: 'Italiano',
    checkInOnline: 'Check-in Online',
    guests: 'ospiti',
    guest: 'ospite',
    nights: 'notti',
    night: 'notte',
    infoRequired: 'Informazioni richieste per legge',
    infoDesc: 'In Italia è obbligatorio comunicare i dati degli ospiti alle autorità di pubblica sicurezza. Compila i dati per ogni ospite.',
    guestN: 'Ospite',
    mainGuest: 'Capofamiglia',
    firstName: 'Nome',
    lastName: 'Cognome',
    sex: 'Sesso',
    male: 'Maschio',
    female: 'Femmina',
    select: 'Seleziona',
    birthDate: 'Data di nascita',
    birthCountry: 'Stato di nascita',
    birthCity: 'Comune di nascita',
    birthCityForeign: 'Città di nascita',
    province: 'Provincia',
    citizenship: 'Cittadinanza',
    residenceSection: 'Residenza',
    residenceCity: 'Comune',
    residenceProvince: 'Provincia',
    residenceCountry: 'Stato',
    documentSection: 'Documento di identità',
    documentType: 'Tipo documento',
    documentNumber: 'Numero documento',
    documentIssueCountry: 'Stato rilascio',
    documentIssueCity: 'Comune rilascio',
    expiryDate: 'Scadenza',
    tourismTypeSection: 'Informazioni soggiorno',
    tourismType: 'Tipo turismo',
    transportMode: 'Mezzo di trasporto',
    addGuest: 'Aggiungi ospite',
    submit: 'Invia dati',
    submitting: 'Invio in corso...',
    invalidLink: 'Link non valido',
    linkExpired: 'Il link potrebbe essere scaduto o non esistere.',
    dataSent: 'Dati inviati!',
    thankYou: 'Grazie per aver completato la registrazione. Il proprietario verificherà i tuoi dati.',
    error: 'Si è verificato un errore. Riprova.',
    privacy: 'I tuoi dati saranno trattati nel rispetto della normativa sulla privacy.',
    placeholderCity: 'es. Roma',
    placeholderIssuer: 'es. Comune di Roma',
  },
  en: {
    locale: enUS,
    flag: '🇬🇧',
    name: 'English',
    checkInOnline: 'Online Check-in',
    guests: 'guests',
    guest: 'guest',
    nights: 'nights',
    night: 'night',
    infoRequired: 'Information required by law',
    infoDesc: 'In Italy, guest data must be reported to public security authorities. Please fill in the details for each guest.',
    guestN: 'Guest',
    mainGuest: 'Main Guest',
    firstName: 'First Name',
    lastName: 'Last Name',
    sex: 'Sex',
    male: 'Male',
    female: 'Female',
    select: 'Select',
    birthDate: 'Date of Birth',
    birthCountry: 'Country of Birth',
    birthCity: 'City of Birth',
    birthCityForeign: 'City of Birth',
    province: 'Province',
    citizenship: 'Citizenship',
    residenceSection: 'Residence',
    residenceCity: 'City',
    residenceProvince: 'Province',
    residenceCountry: 'Country',
    documentSection: 'Identity Document',
    documentType: 'Document Type',
    documentNumber: 'Document Number',
    documentIssueCountry: 'Issue Country',
    documentIssueCity: 'Issue City',
    expiryDate: 'Expiry Date',
    tourismTypeSection: 'Stay Information',
    tourismType: 'Tourism Type',
    transportMode: 'Transport Mode',
    addGuest: 'Add guest',
    submit: 'Submit data',
    submitting: 'Submitting...',
    invalidLink: 'Invalid link',
    linkExpired: 'The link may have expired or does not exist.',
    dataSent: 'Data sent!',
    thankYou: 'Thank you for completing the registration. The owner will verify your data.',
    error: 'An error occurred. Please try again.',
    privacy: 'Your data will be processed in accordance with privacy regulations.',
    placeholderCity: 'e.g. Rome',
    placeholderIssuer: 'e.g. Municipality of Rome',
  },
  es: {
    locale: es,
    flag: '🇪🇸',
    name: 'Español',
    checkInOnline: 'Check-in Online',
    guests: 'huéspedes',
    guest: 'huésped',
    nights: 'noches',
    night: 'noche',
    infoRequired: 'Información requerida por ley',
    infoDesc: 'En Italia es obligatorio comunicar los datos de los huéspedes a las autoridades de seguridad pública. Complete los datos de cada huésped.',
    guestN: 'Huésped',
    mainGuest: 'Huésped Principal',
    firstName: 'Nombre',
    lastName: 'Apellido',
    sex: 'Sexo',
    male: 'Masculino',
    female: 'Femenino',
    select: 'Seleccionar',
    birthDate: 'Fecha de nacimiento',
    birthCountry: 'País de nacimiento',
    birthCity: 'Ciudad de nacimiento',
    birthCityForeign: 'Ciudad de nacimiento',
    province: 'Provincia',
    citizenship: 'Ciudadanía',
    residenceSection: 'Residencia',
    residenceCity: 'Ciudad',
    residenceProvince: 'Provincia',
    residenceCountry: 'País',
    documentSection: 'Documento de identidad',
    documentType: 'Tipo de documento',
    documentNumber: 'Número de documento',
    documentIssueCountry: 'País de emisión',
    documentIssueCity: 'Ciudad de emisión',
    expiryDate: 'Fecha de vencimiento',
    tourismTypeSection: 'Información de estancia',
    tourismType: 'Tipo de turismo',
    transportMode: 'Medio de transporte',
    addGuest: 'Añadir huésped',
    submit: 'Enviar datos',
    submitting: 'Enviando...',
    invalidLink: 'Enlace no válido',
    linkExpired: 'El enlace puede haber caducado o no existe.',
    dataSent: '¡Datos enviados!',
    thankYou: 'Gracias por completar el registro. El propietario verificará sus datos.',
    error: 'Se produjo un error. Inténtelo de nuevo.',
    privacy: 'Sus datos serán tratados de acuerdo con la normativa de privacidad.',
    placeholderCity: 'ej. Roma',
    placeholderIssuer: 'ej. Comune di Roma',
  },
  fr: {
    locale: fr,
    flag: '🇫🇷',
    name: 'Français',
    checkInOnline: 'Enregistrement en ligne',
    guests: 'invités',
    guest: 'invité',
    nights: 'nuits',
    night: 'nuit',
    infoRequired: 'Informations requises par la loi',
    infoDesc: 'En Italie, il est obligatoire de communiquer les données des invités aux autorités de sécurité publique. Veuillez remplir les informations pour chaque invité.',
    guestN: 'Invité',
    mainGuest: 'Invité Principal',
    firstName: 'Prénom',
    lastName: 'Nom',
    sex: 'Sexe',
    male: 'Masculin',
    female: 'Féminin',
    select: 'Sélectionner',
    birthDate: 'Date de naissance',
    birthCountry: 'Pays de naissance',
    birthCity: 'Ville de naissance',
    birthCityForeign: 'Ville de naissance',
    province: 'Province',
    citizenship: 'Citoyenneté',
    residenceSection: 'Résidence',
    residenceCity: 'Ville',
    residenceProvince: 'Province',
    residenceCountry: 'Pays',
    documentSection: "Document d'identité",
    documentType: 'Type de document',
    documentNumber: 'Numéro de document',
    documentIssueCountry: 'Pays de délivrance',
    documentIssueCity: 'Ville de délivrance',
    expiryDate: "Date d'expiration",
    addGuest: 'Ajouter un invité',
    submit: 'Envoyer les données',
    submitting: 'Envoi en cours...',
    invalidLink: 'Lien invalide',
    linkExpired: "Le lien a peut-être expiré ou n'existe pas.",
    dataSent: 'Données envoyées !',
    thankYou: "Merci d'avoir complété l'enregistrement. Le propriétaire vérifiera vos données.",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    privacy: 'Vos données seront traitées conformément à la réglementation sur la vie privée.',
    placeholderCity: 'ex. Rome',
    placeholderIssuer: 'ex. Comune di Roma',
  },
  zh: {
    locale: zhCN,
    flag: '🇨🇳',
    name: '中文',
    checkInOnline: '在线登记',
    guests: '位客人',
    guest: '位客人',
    nights: '晚',
    night: '晚',
    infoRequired: '法律要求的信息',
    infoDesc: '在意大利，必须向公共安全当局报告客人信息。请填写每位客人的详细信息。',
    guestN: '客人',
    mainGuest: '主要客人',
    firstName: '名',
    lastName: '姓',
    sex: '性别',
    male: '男',
    female: '女',
    select: '请选择',
    birthDate: '出生日期',
    birthCountry: '出生国家',
    birthCity: '出生城市',
    birthCityForeign: '出生城市',
    province: '省份',
    citizenship: '国籍',
    residenceSection: '居住地',
    residenceCity: '城市',
    residenceProvince: '省份',
    residenceCountry: '国家',
    documentSection: '身份证件',
    documentType: '证件类型',
    documentNumber: '证件号码',
    documentIssueCountry: '签发国家',
    documentIssueCity: '签发城市',
    expiryDate: '有效期至',
    addGuest: '添加客人',
    submit: '提交信息',
    submitting: '提交中...',
    invalidLink: '链接无效',
    linkExpired: '链接可能已过期或不存在。',
    dataSent: '数据已发送！',
    thankYou: '感谢您完成登记。房东将验证您的信息。',
    error: '发生错误，请重试。',
    privacy: '您的信息将按照隐私法规进行处理。',
    placeholderCity: '例如：罗马',
    placeholderIssuer: '例如：罗马市政府',
  },
  ar: {
    locale: ar,
    flag: '🇸🇦',
    name: 'العربية',
    checkInOnline: 'تسجيل الوصول عبر الإنترنت',
    guests: 'ضيوف',
    guest: 'ضيف',
    nights: 'ليالي',
    night: 'ليلة',
    infoRequired: 'معلومات مطلوبة قانونياً',
    infoDesc: 'في إيطاليا، يجب الإبلاغ عن بيانات الضيوف إلى سلطات الأمن العام. يرجى ملء البيانات لكل ضيف.',
    guestN: 'الضيف',
    mainGuest: 'الضيف الرئيسي',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    sex: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    select: 'اختر',
    birthDate: 'تاريخ الميلاد',
    birthCountry: 'بلد الميلاد',
    birthCity: 'مدينة الميلاد',
    birthCityForeign: 'مدينة الميلاد',
    province: 'المقاطعة',
    citizenship: 'الجنسية',
    residenceSection: 'مكان الإقامة',
    residenceCity: 'المدينة',
    residenceProvince: 'المقاطعة',
    residenceCountry: 'الدولة',
    documentSection: 'وثيقة الهوية',
    documentType: 'نوع الوثيقة',
    documentNumber: 'رقم الوثيقة',
    documentIssueCountry: 'دولة الإصدار',
    documentIssueCity: 'مدينة الإصدار',
    expiryDate: 'تاريخ الانتهاء',
    addGuest: 'إضافة ضيف',
    submit: 'إرسال البيانات',
    submitting: 'جاري الإرسال...',
    invalidLink: 'رابط غير صالح',
    linkExpired: 'قد يكون الرابط منتهي الصلاحية أو غير موجود.',
    dataSent: 'تم إرسال البيانات!',
    thankYou: 'شكراً لإتمام التسجيل. سيقوم المالك بالتحقق من بياناتك.',
    error: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    privacy: 'سيتم معالجة بياناتك وفقاً للوائح الخصوصية.',
    placeholderCity: 'مثال: روما',
    placeholderIssuer: 'مثال: بلدية روما',
  },
};

const EMPTY_GUEST = {
  firstName: '',
  lastName: '',
  sex: '',
  birthDate: '',
  birthCity: '',
  birthProvince: '',
  birthCountry: '100',
  citizenship: '100',
  residenceCity: '',
  residenceProvince: '',
  residenceCountry: '100',
  documentType: 'IDENT',
  documentNumber: '',
  documentIssueCountry: '100',
  documentIssueCity: '',
  documentExpiry: '',
};

export const GuestCheckIn = () => {
  const { token } = useParams();
  const [guests, setGuests] = useState([{ ...EMPTY_GUEST }]);
  const [expandedGuest, setExpandedGuest] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [lang, setLang] = useState('en');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = translations[lang];

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language.split('-')[0];
    if (translations[browserLang]) {
      setLang(browserLang);
    }
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['checkin', token],
    queryFn: () => getBookingByToken(token),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: (guestData) => submitGuestData(token, guestData),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  // Initialize guests from booking if available
  useEffect(() => {
    if (data?.booking?.guests?.length > 0) {
      setGuests(
        data.booking.guests.map((g) => ({
          ...EMPTY_GUEST,
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          sex: g.sex || '',
          birthDate: g.birthDate ? format(new Date(g.birthDate), 'yyyy-MM-dd') : '',
          birthCity: g.birthCity || '',
          birthProvince: g.birthProvince || '',
          birthCountry: g.birthCountry || '100',
          citizenship: g.citizenship || '100',
          residenceCity: g.residenceCity || '',
          residenceProvince: g.residenceProvince || '',
          residenceCountry: g.residenceCountry || '100',
          documentType: g.documentType || 'IDENT',
          documentNumber: g.documentNumber || '',
          documentIssueCountry: g.documentIssueCountry || '100',
          documentIssueCity: g.documentIssueCity || '',
          documentExpiry: g.documentExpiry ? format(new Date(g.documentExpiry), 'yyyy-MM-dd') : '',
        }))
      );
    } else if (data?.booking?.numberOfGuests) {
      const numGuests = data.booking.numberOfGuests;
      const guestArray = Array(numGuests)
        .fill(null)
        .map(() => ({ ...EMPTY_GUEST }));
      if (data.booking.guestName) {
        const nameParts = data.booking.guestName.split(' ');
        guestArray[0].firstName = nameParts[0] || '';
        guestArray[0].lastName = nameParts.slice(1).join(' ') || '';
      }
      setGuests(guestArray);
    }
  }, [data]);

  const updateGuest = (index, field, value) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setGuests(newGuests);
  };

  const addGuest = () => {
    setGuests([...guests, { ...EMPTY_GUEST }]);
    setExpandedGuest(guests.length);
  };

  const removeGuest = (index) => {
    if (guests.length > 1) {
      const newGuests = guests.filter((_, i) => i !== index);
      setGuests(newGuests);
      if (expandedGuest >= newGuests.length) {
        setExpandedGuest(newGuests.length - 1);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitMutation.mutate(guests);
  };

  const isItalian = (countryCode) => countryCode === '100';

  // Language selector component
  const LanguageSelector = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowLangMenu(!showLangMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium hover:border-primary-300 transition-colors"
      >
        <Globe className="w-4 h-4 text-gray-500" />
        <span className="text-lg">{t.flag}</span>
        <span className="hidden sm:inline">{t.name}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {showLangMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowLangMenu(false)}
          />
          <div className="absolute right-0 mt-2 py-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 min-w-[160px]">
            {Object.entries(translations).map(([code, trans]) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLang(code);
                  setShowLangMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 ${
                  lang === code ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                }`}
              >
                <span className="text-xl">{trans.flag}</span>
                <span className="font-medium">{trans.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <AlertCircle className="w-14 h-14 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t.invalidLink}</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {error.response?.data?.error || t.linkExpired}
          </p>
        </div>
      </div>
    );
  }

  if (submitted || data?.booking?.checkInCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
          <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t.dataSent}</h1>
          <p className="text-gray-600 text-sm sm:text-base">{t.thankYou}</p>
        </div>
      </div>
    );
  }

  const { booking, documentTypes, countries, provinces } = data;

  return (
    <div className={`min-h-screen bg-gray-50 py-4 sm:py-6 px-3 sm:px-4 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Header with Language Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t.checkInOnline}</h1>
            <LanguageSelector />
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2.5 sm:gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{booking.property?.name}</span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 text-gray-700">
              <Calendar className="w-5 h-5 text-primary-600 flex-shrink-0" />
              <span className="text-sm sm:text-base">
                {format(new Date(booking.checkIn), 'd MMMM yyyy', { locale: t.locale })} -{' '}
                {format(new Date(booking.checkOut), 'd MMMM yyyy', { locale: t.locale })}
              </span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 text-gray-700">
              <Users className="w-5 h-5 text-primary-600 flex-shrink-0" />
              <span className="text-sm sm:text-base">
                {booking.numberOfGuests} {booking.numberOfGuests === 1 ? t.guest : t.guests} -{' '}
                {booking.nights} {booking.nights === 1 ? t.night : t.nights}
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex gap-2.5 sm:gap-3">
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">{t.infoRequired}</p>
              <p className="leading-relaxed">{t.infoDesc}</p>
            </div>
          </div>
        </div>

        {/* Guest Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {guests.map((guest, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Guest Header */}
                <button
                  type="button"
                  onClick={() => setExpandedGuest(expandedGuest === index ? -1 : index)}
                  className="w-full flex items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">
                        {guest.firstName && guest.lastName
                          ? `${guest.firstName} ${guest.lastName}`
                          : `${t.guestN} ${index + 1}`}
                      </div>
                      {index === 0 && (
                        <div className="text-xs text-primary-600 font-medium">{t.mainGuest}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {guests.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGuest(index);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {expandedGuest === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Guest Fields */}
                {expandedGuest === index && (
                  <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {/* Nome e Cognome */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          {t.firstName} *
                        </label>
                        <input
                          type="text"
                          required
                          value={guest.firstName}
                          onChange={(e) => updateGuest(index, 'firstName', e.target.value)}
                          className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          {t.lastName} *
                        </label>
                        <input
                          type="text"
                          required
                          value={guest.lastName}
                          onChange={(e) => updateGuest(index, 'lastName', e.target.value)}
                          className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* Sesso e Data di nascita */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          {t.sex} *
                        </label>
                        <select
                          required
                          value={guest.sex}
                          onChange={(e) => updateGuest(index, 'sex', e.target.value)}
                          className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                          <option value="">{t.select}</option>
                          <option value="M">{t.male}</option>
                          <option value="F">{t.female}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          {t.birthDate} *
                        </label>
                        <input
                          type="date"
                          required
                          value={guest.birthDate}
                          onChange={(e) => updateGuest(index, 'birthDate', e.target.value)}
                          className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    {/* Luogo di nascita */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t.birthCountry} *
                      </label>
                      <select
                        required
                        value={guest.birthCountry}
                        onChange={(e) => updateGuest(index, 'birthCountry', e.target.value)}
                        className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isItalian(guest.birthCountry) && (
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t.birthCity} *
                          </label>
                          <input
                            type="text"
                            required
                            value={guest.birthCity}
                            onChange={(e) => updateGuest(index, 'birthCity', e.target.value)}
                            placeholder={t.placeholderCity}
                            className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t.province} *
                          </label>
                          <select
                            required
                            value={guest.birthProvince}
                            onChange={(e) => updateGuest(index, 'birthProvince', e.target.value)}
                            className="w-full px-2 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            <option value="">--</option>
                            {provinces.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {!isItalian(guest.birthCountry) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          {t.birthCityForeign} *
                        </label>
                        <input
                          type="text"
                          required
                          value={guest.birthCity}
                          onChange={(e) => updateGuest(index, 'birthCity', e.target.value)}
                          className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}

                    {/* Cittadinanza */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t.citizenship} *
                      </label>
                      <select
                        required
                        value={guest.citizenship}
                        onChange={(e) => updateGuest(index, 'citizenship', e.target.value)}
                        className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Residenza */}
                    <div className="border-t-2 border-gray-100 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">{t.residenceSection}</h4>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        {t.residenceCountry} *
                      </label>
                      <select
                        required
                        value={guest.residenceCountry}
                        onChange={(e) => updateGuest(index, 'residenceCountry', e.target.value)}
                        className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isItalian(guest.residenceCountry) ? (
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t.residenceCity} *
                          </label>
                          <input
                            type="text"
                            required
                            value={guest.residenceCity}
                            onChange={(e) => updateGuest(index, 'residenceCity', e.target.value)}
                            placeholder={t.placeholderCity}
                            className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t.residenceProvince} *
                          </label>
                          <select
                            required
                            value={guest.residenceProvince}
                            onChange={(e) => updateGuest(index, 'residenceProvince', e.target.value)}
                            className="w-full px-2 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            <option value="">--</option>
                            {provinces.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                          {t.residenceCity} *
                        </label>
                        <input
                          type="text"
                          required
                          value={guest.residenceCity}
                          onChange={(e) => updateGuest(index, 'residenceCity', e.target.value)}
                          className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    )}

                    {/* Documento (solo per capofamiglia) */}
                    {index === 0 && (
                      <>
                        <div className="border-t-2 border-gray-100 pt-4 mt-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">{t.documentSection}</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                              {t.documentType} *
                            </label>
                            <select
                              required
                              value={guest.documentType}
                              onChange={(e) => updateGuest(index, 'documentType', e.target.value)}
                              className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                            >
                              {documentTypes.map((dt) => (
                                <option key={dt.code} value={dt.code}>
                                  {dt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                              {t.documentNumber} *
                            </label>
                            <input
                              type="text"
                              required
                              value={guest.documentNumber}
                              onChange={(e) => updateGuest(index, 'documentNumber', e.target.value)}
                              className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </div>

                        {/* Document Issue Country */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            {t.documentIssueCountry} *
                          </label>
                          <select
                            required
                            value={guest.documentIssueCountry}
                            onChange={(e) => updateGuest(index, 'documentIssueCountry', e.target.value)}
                            className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                          >
                            {countries.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Document Issue City - with province for Italian documents */}
                        {isItalian(guest.documentIssueCountry) ? (
                          <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="col-span-2">
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                {t.documentIssueCity} *
                              </label>
                              <input
                                type="text"
                                required
                                value={guest.documentIssueCity}
                                onChange={(e) => updateGuest(index, 'documentIssueCity', e.target.value)}
                                placeholder={t.placeholderCity}
                                className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                {t.expiryDate}
                              </label>
                              <input
                                type="date"
                                value={guest.documentExpiry}
                                onChange={(e) => updateGuest(index, 'documentExpiry', e.target.value)}
                                className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                {t.documentIssueCity}
                              </label>
                              <input
                                type="text"
                                value={guest.documentIssueCity}
                                onChange={(e) => updateGuest(index, 'documentIssueCity', e.target.value)}
                                className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                {t.expiryDate}
                              </label>
                              <input
                                type="date"
                                value={guest.documentExpiry}
                                onChange={(e) => updateGuest(index, 'documentExpiry', e.target.value)}
                                className="w-full px-3 sm:px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Guest Button */}
          <button
            type="button"
            onClick={addGuest}
            className="w-full mb-4 sm:mb-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-500 hover:text-primary-600 active:bg-primary-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
          >
            <Plus className="w-5 h-5" />
            {t.addGuest}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base sm:text-lg shadow-lg"
          >
            {submitMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t.submitting}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                {t.submit}
              </>
            )}
          </button>

          {submitMutation.isError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {submitMutation.error?.response?.data?.error || t.error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs sm:text-sm text-gray-500 px-4">
          {t.privacy}
        </div>
      </div>
    </div>
  );
};

export default GuestCheckIn;
