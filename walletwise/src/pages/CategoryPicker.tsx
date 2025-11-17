import React, { useMemo } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonText,
} from '@ionic/react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuthStore } from '../state/useAuthStore';
import { useCategories, CATEGORY_DEFAULTS } from '../features/categories/useCategories';
import type { Category, CategoryType } from '../types/category';

export const CategoryPicker: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { user } = useAuthStore();
  const uid = user?.uid;

  const params = new URLSearchParams(location.search);
  const modeParam = params.get('mode');
  const dateParam = params.get('date');
  const initialType: CategoryType =
    modeParam === 'income' || modeParam === 'expense' ? modeParam : 'expense';
  const returnTo = params.get('returnTo') || '/transactions/new';

  const { items: allCategories } = useCategories(uid);

  const categories = useMemo(() => {
    const filtered = allCategories.filter((c) => c.type === initialType);
    if (filtered.length > 0) return filtered;
    // Fallback to built-in defaults if user has no categories yet
    const fallback: Category[] = CATEGORY_DEFAULTS
      .filter((c) => c.type === initialType)
      .map((c, index) => ({
        id: `default-${c.type}-${index}`,
        name: c.name,
        type: c.type,
        subcategories: c.subcategories ?? [],
        isSystem: true,
        createdAt: null,
        updatedAt: null,
      }));
    return fallback;
  }, [allCategories, initialType]);

  const handleCategoryClick = (name: string) => {
    const next = new URLSearchParams();
    next.set('mode', initialType);
    next.set('category', name);
    if (dateParam) {
      next.set('date', dateParam);
    }
    history.replace({
      pathname: returnTo,
      search: `?${next.toString()}`,
      state: {
        mode: initialType,
        category: name,
        date: dateParam ?? undefined,
      },
    });
  };

  const title = 'Choose category';

  const subtitle =
    initialType === 'income'
      ? 'Pick where money is coming from'
      : 'Pick where money is going';

  const showEmpty = categories.length === 0;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={returnTo} text="" />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="app-content">
        <div className="section-stack">
          <IonText color="medium">
            <p className="body">{subtitle}</p>
          </IonText>

          <IonList inset>
            <IonListHeader>
              <IonLabel>
                {initialType === 'income'
                  ? 'Income categories'
                  : 'Expense categories'}
              </IonLabel>
            </IonListHeader>

            {showEmpty ? (
              <IonItem>
                <IonLabel>
                  No categories available.
                </IonLabel>
              </IonItem>
            ) : (
              categories.map((cat) => (
                <IonItem
                  key={cat.id}
                  button
                  detail
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  <IonLabel>{cat.name}</IonLabel>
                </IonItem>
              ))
            )}
          </IonList>
        </div>
      </IonContent>
    </IonPage>
  );
};
