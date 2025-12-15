import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AddIcon } from '@/components/ui/icon';
import { Edit2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

export default function VehicleDrawer() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userVehicles, selectedVehicle, setSelectedVehicle } = useApp();

  const handleSelectVehicle = async (vehicleId: number) => {
    const vehicle = userVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      await setSelectedVehicle(vehicle);
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Box className="flex-1 bg-background-0">
      <VStack className="p-4 flex-1" space="lg">
        <HStack className="justify-between items-center">
          <Heading size="xl">{t('vehicles.selectVehicle')}</Heading>
          <Button
            size="sm"
            onPress={() => router.push('/vehicles/create')}
          >
            <ButtonIcon as={AddIcon} />
            <ButtonText>{t('common.add')}</ButtonText>
          </Button>
        </HStack>

        <ScrollView>
          <VStack space="md">
            {userVehicles.length === 0 ? (
              <Card className="p-6">
                <VStack space="md" className="items-center">
                  <Text className="text-center text-typography-500">
                    {t('vehicles.noVehicles')}
                  </Text>
                  <Button onPress={() => router.push('/vehicles/create')}>
                    <ButtonText>{t('vehicles.addNew')}</ButtonText>
                  </Button>
                </VStack>
              </Card>
            ) : (
              userVehicles.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className={`p-4 ${
                    selectedVehicle?.id === vehicle.id
                      ? 'border-2 border-primary-500'
                      : ''
                  }`}
                >
                  <VStack space="sm">
                    <HStack className="justify-between items-start">
                      <VStack space="xs" className="flex-1">
                        <TouchableOpacity onPress={() => handleSelectVehicle(vehicle.id)}>
                          <Heading size="md">{vehicle.name}</Heading>
                        </TouchableOpacity>
                        {vehicle.brand_name && (
                          <Text className="text-typography-600">
                            {vehicle.brand_name}
                            {vehicle.model && ` ${vehicle.model}`}
                          </Text>
                        )}
                        {vehicle.license_plate && (
                          <Text className="text-sm text-typography-500">
                            {vehicle.license_plate}
                          </Text>
                        )}
                        <HStack space="xs" className="mt-1">
                          <Box className="bg-background-100 px-2 py-1 rounded">
                            <Text className="text-xs">
                              {t(`fuelTypes.${vehicle.fuel_type}`)}
                            </Text>
                          </Box>
                          {vehicle.is_income_generating && (
                            <Box className="bg-success-100 px-2 py-1 rounded">
                              <Text className="text-xs text-success-700">
                                {t('vehicles.isIncomeGenerating')}
                              </Text>
                            </Box>
                          )}
                        </HStack>
                      </VStack>
                      <HStack space="xs">
                        <Button
                          size="xs"
                          variant="outline"
                          onPress={() => router.push(`/vehicles/${vehicle.id}`)}
                        >
                          <ButtonIcon as={Edit2} />
                        </Button>
                      </HStack>
                    </HStack>
                  </VStack>
                </Card>
              ))
            )}
          </VStack>
        </ScrollView>

        <Button
          variant="outline"
          onPress={() => router.back()}
        >
          <ButtonText>{t('common.close')}</ButtonText>
        </Button>
      </VStack>
    </Box>
    </SafeAreaView>
  );
}
