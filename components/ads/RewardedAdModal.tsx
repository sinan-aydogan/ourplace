import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon, CloseIcon } from '@/components/ui/icon';
import { useRewardedAd } from './RewardedAd';
import { AD_UNITS } from '@/services/admob';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewarded: () => void;
  limitType: 'vehicle_add' | 'expense_type_add' | 'income_type_add';
}

export function RewardedAdModal({
  isOpen,
  onClose,
  onRewarded,
  limitType,
}: RewardedAdModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const { show, isLoaded, isLoading: adLoading } = useRewardedAd(AD_UNITS.REWARDED, () => {
    onRewarded();
    Alert.alert(t('common.success'), t('ads.adRewarded'));
    onClose();
  });

  const handleShowAd = async () => {
    if (!isLoaded) {
      Alert.alert(t('common.error'), t('ads.adError'));
      return;
    }

    setIsLoading(true);
    try {
      await show();
    } catch (error) {
      console.error('Failed to show ad:', error);
      Alert.alert(t('common.error'), t('ads.adError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading>{t('ads.watchAdAndAdd')}</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <Text>{t('ads.watchAdDescription')}</Text>
            {adLoading && <Text className="text-typography-500">{t('ads.adLoading')}</Text>}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            onPress={handleShowAd}
            isDisabled={!isLoaded || isLoading || adLoading}
            className="flex-1"
          >
            <ButtonText>{t('ads.watchAdAndAdd')}</ButtonText>
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

