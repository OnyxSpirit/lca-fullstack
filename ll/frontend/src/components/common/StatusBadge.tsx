import React from 'react';
import { Badge } from '../ui/Badge';
import {
  VehicleStatus,
  LeadStage,
  RepairOrderStatus,
  SaleStatus,
  DeliveryStatus,
  InvoiceStatus,
  PartStockStatus,
} from '../../types';

interface StatusBadgeProps {
  status:
    | VehicleStatus
    | LeadStage
    | RepairOrderStatus
    | SaleStatus
    | DeliveryStatus
    | InvoiceStatus
    | PartStockStatus
    | string;
  type?: 'vehicle' | 'lead' | 'or' | 'sale' | 'delivery' | 'invoice' | 'part' | 'general';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'general' }) => {
  switch (status) {
    // Vehicle statuses
    case 'COMMANDE':
      return <Badge variant="info" dot>Commandé</Badge>;
    case 'EN_TRANSIT':
      return <Badge variant="purple" dot>En Transit</Badge>;
    case 'RECEPTIONNE':
      return <Badge variant="primary" dot>Réceptionné</Badge>;
    case 'PREPARATION':
      return <Badge variant="warning" dot>Préparation</Badge>;
    case 'DISPONIBLE':
      return <Badge variant="success" dot>Disponible</Badge>;
    case 'RESERVE':
      return <Badge variant="warning" dot>Réservé</Badge>;
    case 'VENDU':
      return <Badge variant="primary" dot>Vendu</Badge>;
    case 'LIVRE':
      return <Badge variant="default" dot>Livré</Badge>;

    // Lead stages
    case 'NOUVEAU':
      return <Badge variant="info" dot>Nouveau</Badge>;
    case 'CONTACTE':
      return <Badge variant="primary" dot>Contacté</Badge>;
    case 'QUALIFIE':
      return <Badge variant="purple" dot>Qualifié</Badge>;
    case 'RDV':
      return <Badge variant="warning" dot>Rendez-vous</Badge>;
    case 'ESSAI':
      return <Badge variant="info" dot>Essai</Badge>;
    case 'OFFRE':
      return <Badge variant="primary" dot>Offre</Badge>;
    case 'NEGOCIATION':
      return <Badge variant="warning" dot>Négociation</Badge>;
    case 'GAGNE':
      return <Badge variant="success" dot>Gagné</Badge>;
    case 'PERDU':
      return <Badge variant="danger" dot>Perdu</Badge>;

    // Repair Orders (OR)
    case 'PLANIFIE':
      return <Badge variant="default" dot>Planifié</Badge>;
    case 'DIAGNOSTIC':
      return <Badge variant="info" dot>Diagnostic</Badge>;
    case 'ATTENTE_VALIDATION':
      return <Badge variant="warning" dot>Attente Validation</Badge>;
    case 'EN_COURS':
      return <Badge variant="primary" dot>En Cours</Badge>;
    case 'CONTROLE_QUALITE':
      return <Badge variant="purple" dot>Contrôle Qualité</Badge>;
    case 'PRET':
      return <Badge variant="success" dot>Prêt Atelier</Badge>;
    case 'FACTURE':
      return <Badge variant="primary" dot>Facturé</Badge>;
    case 'CLOTURE':
      return <Badge variant="default" dot>Clôturé</Badge>;

    // Sales
    case 'DEVIS':
      return <Badge variant="default" dot>Devis</Badge>;
    case 'RESERVATION':
      return <Badge variant="warning" dot>Réservation</Badge>;
    case 'FINANCEMENT_EN_ATTENTE':
      return <Badge variant="warning" dot>Financement en attente</Badge>;
    case 'FINANCEMENT_VALIDE':
      return <Badge variant="success" dot>Financement accordé</Badge>;
    case 'PRET_LIVRAISON':
      return <Badge variant="purple" dot>Prêt pour livraison</Badge>;
    case 'ANNULE':
      return <Badge variant="danger" dot>Annulé</Badge>;

    // Deliveries
    case 'EN_PREPARATION':
      return <Badge variant="warning" dot>En Préparation</Badge>;
    case 'CONTROLE_QUALITE_EN_COURS':
      return <Badge variant="purple" dot>Contrôle Qualité</Badge>;
    case 'VALIDE_POUR_LIVRAISON':
      return <Badge variant="info" dot>Validé Livraison</Badge>;
    case 'RDV_CONFIRME':
      return <Badge variant="primary" dot>RDV Confirmé</Badge>;
    case 'EN_COURS_DE_LIVRAISON':
      return <Badge variant="warning" dot>En Remise</Badge>;
    case 'LIVRE_SIGNE':
      return <Badge variant="success" dot>Livré & Signé</Badge>;
    case 'REPORTE':
      return <Badge variant="danger" dot>Reporté</Badge>;

    // Invoices
    case 'BROUILLON':
      return <Badge variant="default">Brouillon</Badge>;
    case 'EN_ATTENTE':
      return <Badge variant="warning" dot>En attente</Badge>;
    case 'VALIDEE':
      return <Badge variant="info" dot>Validée</Badge>;
    case 'PARTIELLEMENT_PAYEE':
      return <Badge variant="warning" dot>Partiellement payée</Badge>;
    case 'PAYEE':
      return <Badge variant="success" dot>Payée</Badge>;
    case 'EN_RETARD':
      return <Badge variant="danger" dot>En retard</Badge>;
    case 'ANNULEE':
      return <Badge variant="default">Annulée</Badge>;

    // Spare parts
    case 'NORMAL':
      return <Badge variant="success" dot>Stock Normal</Badge>;
    case 'FAIBLE':
      return <Badge variant="warning" dot>Stock Faible</Badge>;
    case 'RUPTURE':
      return <Badge variant="danger" dot>Rupture</Badge>;
    case 'DORMANT':
      return <Badge variant="purple" dot>Dormant</Badge>;

    default:
      return <Badge variant="default">{status}</Badge>;
  }
};
