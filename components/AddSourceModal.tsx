import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalBackdrop, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon, CloseIcon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { db } from '@/services/database';
import { useApp } from '@/contexts/AppContext';
import type { EnergyStation, Customer, Company } from '@/types/database';

type SourceType = 'energy_station' | 'customer' | 'company';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceType: SourceType;
  onSuccess: (source: EnergyStation | Customer | Company) => void;
}

export function AddSourceModal({ isOpen, onClose, sourceType, onSuccess }: AddSourceModalProps) {
  const { t } = useTranslation();
  const { user } = useApp();
  const [name, setName] = useState('');
  const [geoCoordinate, setGeoCoordinate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !name.trim()) return;

    try {
      setLoading(true);
      
      let newSource;
      if (sourceType === 'energy_station') {
        newSource = await db.createEnergyStation({
          user_id: user.id,
          name: name.trim(),
          geo_coordinate: geoCoordinate.trim() || null,
        });
      } else if (sourceType === 'customer') {
        newSource = await db.createCustomer({
          user_id: user.id,
          name: name.trim(),
          geo_coordinate: geoCoordinate.trim() || null,
        });
      } else {
        newSource = await db.createCompany({
          user_id: user.id,
          name: name.trim(),
          geo_coordinate: geoCoordinate.trim() || null,
        });
      }

      onSuccess(newSource);
      setName('');
      setGeoCoordinate('');
      onClose();
    } catch (error) {
      console.error(`Failed to create ${sourceType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (sourceType) {
      case 'energy_station':
        return t('sources.addEnergyStation');
      case 'customer':
        return t('sources.addCustomer');
      case 'company':
        return t('sources.addCompany');
    }
  };

  const getNamePlaceholder = () => {
    switch (sourceType) {
      case 'energy_station':
        return t('sources.stationName');
      case 'customer':
        return t('sources.customerName');
      case 'company':
        return t('sources.companyName');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-w-[400px]">
        <ModalHeader>
          <Heading size="md">{getTitle()}</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <VStack space="xs">
              <Text className="font-semibold">{getNamePlaceholder()} *</Text>
              <Input>
                <InputField
                  placeholder={getNamePlaceholder()}
                  value={name}
                  onChangeText={setName}
                />
              </Input>
            </VStack>

            <VStack space="xs">
              <Text className="font-semibold">{t('sources.geoCoordinate')}</Text>
              <Input>
                <InputField
                  placeholder="40.7128,-74.0060"
                  value={geoCoordinate}
                  onChangeText={setGeoCoordinate}
                />
              </Input>
            </VStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack space="md" className="w-full">
            <Button
              variant="outline"
              className="flex-1"
              onPress={onClose}
            >
              <ButtonText>{t('common.cancel')}</ButtonText>
            </Button>
            <Button
              className="flex-1"
              onPress={handleSubmit}
              isDisabled={!name.trim() || loading}
            >
              <ButtonText>
                {loading ? t('common.loading') : t('common.add')}
              </ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
