import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';

export const PricingPage = () => {
    const { t } = useTranslation();

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
                        {t('pricing.title')}
                    </h2>
                    <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
                        {t('pricing.subtitle')}
                    </p>
                </div>

                <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
                    {/* Starter Plan */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-colors duration-200">
                        <div className="px-6 py-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pricing.starter')}</h3>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">{t('pricing.starter_desc')}</p>
                            <p className="mt-8">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span>
                                <span className="text-base font-medium text-gray-500 dark:text-gray-400">{t('pricing.month')}</span>
                            </p>
                            <Link to="/auth">
                                <Button className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    {t('home.get_started')}
                                </Button>
                            </Link>
                        </div>
                        <div className="px-6 pt-6 pb-8 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">{t('pricing.whats_included')}</h4>
                            <ul className="mt-6 space-y-4">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">100 {t('pricing.verifications_mo')}</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{t('pricing.standard_support')}</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{t('pricing.api_access')}</p>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Growth Plan */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 border-blue-600 transition-colors duration-200">
                        <div className="px-6 py-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pricing.growth')}</h3>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">{t('pricing.growth_desc')}</p>
                            <p className="mt-8">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$49</span>
                                <span className="text-base font-medium text-gray-500 dark:text-gray-400">{t('pricing.month')}</span>
                            </p>
                            <Link to="/auth">
                                <Button className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    {t('home.get_started')}
                                </Button>
                            </Link>
                        </div>
                        <div className="px-6 pt-6 pb-8 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">{t('pricing.whats_included')}</h4>
                            <ul className="mt-6 space-y-4">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">5,000 {t('pricing.verifications_mo')}</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{t('pricing.priority_support')}</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{t('pricing.advanced_analytics')}</p>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-colors duration-200">
                        <div className="px-6 py-8">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pricing.enterprise')}</h3>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">{t('pricing.enterprise_desc')}</p>
                            <p className="mt-8">
                                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('pricing.custom')}</span>
                            </p>
                            <Link to="/contact">
                                <Button variant="outline" className="mt-8 block w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 rounded-md py-2 text-sm font-semibold text-center">
                                    {t('pricing.contact_sales')}
                                </Button>
                            </Link>
                        </div>
                        <div className="px-6 pt-6 pb-8 bg-gray-50 dark:bg-gray-700 transition-colors duration-200">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white tracking-wide uppercase">{t('pricing.whats_included')}</h4>
                            <ul className="mt-6 space-y-4">
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{t('pricing.unlimited_verifications')}</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{t('pricing.dedicated_manager')}</p>
                                </li>
                                <li className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="ml-3 text-base text-gray-700 dark:text-gray-300">{t('pricing.sla_contracts')}</p>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
