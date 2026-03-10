import { Tabs } from 'expo-router';
import { Home, PieChart, Camera, Settings } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#111111',
                    borderTopColor: '#27272a',
                },
                tabBarActiveTintColor: '#ffffff',
                tabBarInactiveTintColor: '#a1a1aa',
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="insights"
                options={{
                    title: 'Insights',
                    tabBarIcon: ({ color }) => <PieChart color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="scanner"
                options={{
                    title: 'Scanner',
                    tabBarIcon: ({ color }) => <Camera color={color} size={24} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
                }}
            />
        </Tabs>
    );
}
