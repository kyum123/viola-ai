import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import FloodMapScreen from "../screens/FloodMapScreen";
import PriorityListScreen from "../screens/PriorityListScreen";
import RouteGuideScreen from "../screens/RouteGuideScreen";

const Tab = createBottomTabNavigator();

function Icon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.5 }}>
      {emoji}
    </Text>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1d4ed8" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        tabBarActiveTintColor: "#1d4ed8",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tab.Screen
        name="FloodMap"
        component={FloodMapScreen}
        options={{
          title: "침수위험 지도",
          tabBarIcon: ({ focused }) => <Icon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="RouteGuide"
        component={RouteGuideScreen}
        options={{
          title: "귀갓길 안내",
          tabBarIcon: ({ focused }) => <Icon emoji="🧭" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="PriorityList"
        component={PriorityListScreen}
        options={{
          title: "방문 우선순위",
          tabBarIcon: ({ focused }) => <Icon emoji="📋" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
