import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Bell, Shield, Globe, Cpu } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sections = [
    {
      icon: Globe, title: 'Projet cible', desc: 'Configuration des URLs et endpoints à analyser',
      fields: [
        { label: 'URL de l\'application', type: 'text', value: 'https://app.techcorp.io', placeholder: 'https://' },
        { label: 'Environnement', type: 'select', options: ['production', 'staging', 'dev'], value: 'production' },
        { label: 'API base URL', type: 'text', value: 'https://api.techcorp.io', placeholder: 'https://api.' },
      ],
    },
    {
      icon: Cpu, title: 'Scanners', desc: 'Paramètres d\'exécution des scanners',
      fields: [
        { label: 'Timeout scanner (secondes)', type: 'number', value: '120' },
        { label: 'Scans simultanés maximum', type: 'number', value: '3' },
      ],
    },
    {
      icon: Bell, title: 'Alertes', desc: 'Notifications et seuils d\'alerte',
      fields: [
        { label: 'Seuil alerte score global', type: 'number', value: '60' },
        { label: 'Email de notification', type: 'email', value: user?.email || '' },
      ],
    },
    {
      icon: Shield, title: 'Conformité REEN', desc: 'Configuration du reporting réglementaire',
      fields: [
        { label: 'Nom de l\'organisation', type: 'text', value: 'TechCorp SAS' },
        { label: 'Responsable RSE', type: 'email', value: 'rse@techcorp.io' },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-400 text-sm mt-1">Configuration de la plateforme GreenPulse</p>
      </div>

      {sections.map(({ icon: Icon, title, desc, fields }, i) => (
        <motion.div
          key={title}
          className="bg-gray-900 border border-gray-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Icon size={16} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          </div>

          <div className="space-y-4">
            {fields.map(field => (
              <div key={field.label}>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">{field.label}</label>
                {field.type === 'select' ? (
                  <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500">
                    {field.options?.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      <div className="flex items-center gap-3">
        <motion.button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {saved ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Sauvegardé !' : 'Sauvegarder'}
        </motion.button>
        <button className="px-5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}
