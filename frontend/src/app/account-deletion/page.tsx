import type { Metadata } from 'next';
import AccountDeletionClient from './AccountDeletionClient';

export const metadata: Metadata = {
    title: 'Exclusao de conta e dados | GouPay',
    description: 'Solicite a exclusao da sua conta GouPay e dos dados pessoais elegiveis.',
};

export default function AccountDeletionPage() {
    return <AccountDeletionClient />;
}
