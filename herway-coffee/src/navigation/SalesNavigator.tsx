import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import SalesDashboard from '../screens/sales/SalesDashboard';
import CustomerList from '../screens/sales/CustomerList';
import CustomerForm from '../screens/sales/CustomerForm';
import InvoiceList from '../screens/sales/InvoiceList';
import InvoiceForm from '../screens/sales/InvoiceForm';
import InvoiceDetail from '../screens/sales/InvoiceDetail';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: '#5D3A1A' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' as const },
};

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="SalesDashboard" component={SalesDashboard} options={{ title: '☕ Dashboard' }} />
      <Stack.Screen name="InvoiceForm" component={InvoiceForm} options={({ route }: any) => ({ title: route.params?.invoiceId ? 'Edit Invoice' : 'New Invoice' })} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetail} options={{ title: 'Invoice Detail' }} />
      <Stack.Screen name="CustomerForm" component={CustomerForm} options={({ route }: any) => ({ title: route.params?.customer ? 'Edit Customer' : 'Add Customer' })} />
    </Stack.Navigator>
  );
}

function CustomersStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Customers" component={CustomerList} options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomerForm" component={CustomerForm} options={({ route }: any) => ({ title: route.params?.customer ? 'Edit Customer' : 'Add Customer' })} />
    </Stack.Navigator>
  );
}

function InvoicesStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Invoices" component={InvoiceList} options={{ title: 'Invoices' }} />
      <Stack.Screen name="InvoiceForm" component={InvoiceForm} options={({ route }: any) => ({ title: route.params?.invoiceId ? 'Edit Invoice' : 'New Invoice' })} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetail} options={{ title: 'Invoice Detail' }} />
    </Stack.Navigator>
  );
}

export default function SalesNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#5D3A1A',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0e8e0',
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'home' : 'home-outline',
            Customers: focused ? 'people' : 'people-outline',
            Invoices: focused ? 'document-text' : 'document-text-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardStack} />
      <Tab.Screen name="Customers" component={CustomersStack} />
      <Tab.Screen name="Invoices" component={InvoicesStack} />
    </Tab.Navigator>
  );
}
