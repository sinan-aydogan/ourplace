import React, { useState, useEffect } from 'react';
import { ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Select, SelectTrigger, SelectInput, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem, SelectScrollView } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { db } from '@/services/database';
import type { Brand, FuelType, VehicleTypeRecord } from '@/types/database';

export default function CreateVehicle() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refreshVehicles } = useApp();

  const [name, setName] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeRecord[]>([]);
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<number>(1);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [customBrandName, setCustomBrandName] = useState('');
  const [model, setModel] = useState('');
  const [productionYear, setProductionYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('gasoline');
  const [isIncomeGenerating, setIsIncomeGenerating] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allBrands, allVehicleTypes] = await Promise.all([
        db.getBrands(),
        db.getVehicleTypes(),
      ]);
      setBrands(allBrands);
      setVehicleTypes(allVehicleTypes);
      if (allVehicleTypes.length > 0) {
        setSelectedVehicleTypeId(allVehicleTypes[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          'Sorry, we need camera roll permissions to upload vehicle images!'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert(t('common.error'), 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!user || !name || (!selectedBrandId && !customBrandName)) {
      Alert.alert(t('common.error'), t('validation.required'));
      return;
    }

    try {
      setLoading(true);

      await db.createVehicle({
        user_id: user.id,
        name,
        vehicle_type_id: selectedVehicleTypeId,
        brand_id: selectedBrandId,
        custom_brand_name: selectedBrandId ? null : customBrandName,
        model: model || null,
        production_year: productionYear || null,
        license_plate: licensePlate || null,
        fuel_type: fuelType,
        is_income_generating: isIncomeGenerating,
        image_uri: imageUri,
      });

      await refreshVehicles();
      router.back();
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      Alert.alert(t('common.error'), 'Failed to create vehicle');
    } finally {
      setLoading(false);
    }
  };

  const fuelTypeOptions: FuelType[] = ['gasoline', 'diesel', 'electric', 'hybrid', 'lpg'];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <Box className="flex-1 bg-background-0">
      <ScrollView>
        <VStack className="p-4" space="lg">
          <Heading size="xl">{t('vehicles.addNew')}</Heading>

          {/* Vehicle Image */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.vehicleImage')}</Text>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
              <Box className="rounded-xl overflow-hidden border-2 border-dashed border-background-300">
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: '100%', height: 200 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Box className="bg-background-100 items-center justify-center" style={{ height: 200 }}>
                    <VStack space="sm" className="items-center">
                      <Text className="text-5xl">📷</Text>
                      <Text className="text-typography-500 text-sm">{t('vehicles.addPhoto')}</Text>
                    </VStack>
                  </Box>
                )}
              </Box>
            </TouchableOpacity>
            {imageUri && (
              <Button
                variant="link"
                size="sm"
                onPress={() => setImageUri(null)}
              >
                <ButtonText className="text-error-600">{t('vehicles.removePhoto')}</ButtonText>
              </Button>
            )}
          </VStack>

          {/* Vehicle Name */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.vehicleName')} *</Text>
            <Input>
              <InputField
                placeholder={t('vehicles.vehicleName')}
                value={name}
                onChangeText={setName}
              />
            </Input>
          </VStack>

          {/* Vehicle Type Selection */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.vehicleType')} *</Text>
            <Select
              selectedValue={selectedVehicleTypeId.toString()}
              onValueChange={(value) => {
                setSelectedVehicleTypeId(parseInt(value));
              }}
            >
              <SelectTrigger>
                <SelectInput 
                  placeholder={t('vehicles.vehicleType')}
                  value={
                    vehicleTypes.find(vt => vt.id === selectedVehicleTypeId)?.name_key
                      ? t(`vehicles.vehicleType_${vehicleTypes.find(vt => vt.id === selectedVehicleTypeId)?.name_key}`)
                      : ''
                  }
                />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  <SelectScrollView>
                    {vehicleTypes.map((vt) => (
                      <SelectItem
                        key={vt.id}
                        label={t(`vehicles.vehicleType_${vt.name_key}`)}
                        value={vt.id.toString()}
                      />
                    ))}
                  </SelectScrollView>
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>

          {/* Brand Selection */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.brand')} *</Text>
            <Select
              selectedValue={selectedBrandId?.toString() || 'custom'}
              onValueChange={(value) => {
                if (value === 'custom') {
                  setSelectedBrandId(null);
                } else {
                  setSelectedBrandId(parseInt(value));
                  setCustomBrandName('');
                }
              }}
            >
              <SelectTrigger>
                <SelectInput 
                  placeholder={t('vehicles.brand')}
                  value={
                    selectedBrandId 
                      ? brands.find(b => b.id === selectedBrandId)?.name
                      : t('vehicles.customBrand')
                  }
                />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent className="max-h-[60vh]">
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  <SelectScrollView>
                    <SelectItem label={t('vehicles.customBrand')} value="custom" />
                    {brands.map((brand) => (
                      <SelectItem
                        key={brand.id}
                        label={brand.name}
                        value={brand.id.toString()}
                      />
                    ))}
                  </SelectScrollView>
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>

          {/* Custom Brand Name (if custom selected) */}
          {!selectedBrandId && (
            <VStack space="xs">
              <Text className="font-semibold">{t('vehicles.customBrand')} *</Text>
              <Input>
                <InputField
                  placeholder={t('vehicles.customBrand')}
                  value={customBrandName}
                  onChangeText={setCustomBrandName}
                />
              </Input>
            </VStack>
          )}

          {/* Model */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.model')}</Text>
            <Input>
              <InputField
                placeholder={t('vehicles.model')}
                value={model}
                onChangeText={setModel}
              />
            </Input>
          </VStack>

          {/* Production Year */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.productionYear')}</Text>
            <Input>
              <InputField
                placeholder={t('vehicles.productionYear')}
                value={productionYear}
                onChangeText={setProductionYear}
                keyboardType="numeric"
              />
            </Input>
          </VStack>

          {/* License Plate */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.licensePlate')}</Text>
            <Input>
              <InputField
                placeholder={t('vehicles.licensePlate')}
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </Input>
          </VStack>

          {/* Fuel Type */}
          <VStack space="xs">
            <Text className="font-semibold">{t('vehicles.fuelType')} *</Text>
            <Select
              selectedValue={fuelType}
              onValueChange={(value) => setFuelType(value as FuelType)}
            >
              <SelectTrigger>
                <SelectInput 
                  placeholder={t('vehicles.fuelType')}
                  value={t(`fuelTypes.${fuelType}`)}
                />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent>
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  {fuelTypeOptions.map((type) => (
                    <SelectItem
                      key={type}
                      label={t(`fuelTypes.${type}`)}
                      value={type}
                    />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
          </VStack>

          {/* Income Generating */}
          <HStack className="justify-between items-center">
            <VStack className="flex-1">
              <Text className="font-semibold">{t('vehicles.isIncomeGenerating')}</Text>
            </VStack>
            <Switch
              value={isIncomeGenerating}
              onValueChange={setIsIncomeGenerating}
            />
          </HStack>

          {/* Actions */}
          <HStack space="md" className="mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => router.back()}
            >
              <ButtonText>{t('common.cancel')}</ButtonText>
            </Button>
            <Button
              className="flex-1"
              onPress={handleSubmit}
              isDisabled={loading || !name || (!selectedBrandId && !customBrandName)}
            >
              <ButtonText>
                {loading ? t('common.loading') : t('common.save')}
              </ButtonText>
            </Button>
          </HStack>
        </VStack>
      </ScrollView>
    </Box>
    </SafeAreaView>
  );
}
